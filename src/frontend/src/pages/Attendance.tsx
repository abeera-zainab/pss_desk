import { useEffect, useState } from "react";
import type { AttendanceDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { Badge, Spinner, ErrorText } from "../components/ui";
import { formatDate, formatDurationMinutes, elapsedMinutesSince } from "../lib/format";
import type { UserDTO } from "@shared/types";
import { useAuth } from "../store/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClock, 
  faCalendarDay, 
  faCheckCircle, 
  faTimesCircle, 
  faArrowRight,
  faHistory,
  faUser,
  faRocket,
  faFire,
  faCircle,
  faHourglassHalf,
  faCheckDouble,
  faChartBar,
  faArrowRightToBracket,
  faArrowRightFromBracket,
  faHourglass
} from '@fortawesome/free-solid-svg-icons';

// Keyframes for animations
function AttendanceKeyframes() {
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
      @keyframes clockPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `}</style>
  );
}

const STATUS_BADGE: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-600",
  ABSENT: "bg-red-50 text-red-600",
  HALF_DAY: "bg-amber-50 text-amber-600",
  LATE: "bg-amber-50 text-amber-600",
  ON_LEAVE: "bg-blue-50 text-blue-600"
};

const STATUS_ICON: Record<string, any> = {
  PRESENT: faCheckCircle,
  ABSENT: faTimesCircle,
  HALF_DAY: faHourglassHalf,
  LATE: faClock,
  ON_LEAVE: faCircle
};

// checkIn/checkOut are optional as well as nullable on AttendanceDTO: a record
// exists from the moment someone checks in, so checkOut is absent until they leave.
function fmtTime(t: string | null | undefined) {
  if (!t) return "-";
  return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Attendance() {
  const { user } = useAuth();
  const canSeeTeam = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [records, setRecords] = useState<AttendanceDTO[]>([]);
  const [today, setToday] = useState<AttendanceDTO | null>(null);
  const [people, setPeople] = useState<UserDTO[]>([]);
  const [filterUserId, setFilterUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [clock, setClock] = useState(new Date());

  function load() {
    setLoading(true);
    Promise.all([
      api.getAttendance(filterUserId ? { userId: filterUserId } : {}),
      api.getTodayAttendance()
    ])
      .then(([list, t]) => {
        setRecords(list);
        setToday(t);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [filterUserId]);

  useEffect(() => {
    if (!canSeeTeam) return;
    if (user?.role === "ADMIN") {
      api.getUsers({ limit: 100 }).then((r) => setPeople(r.data));
    } else {
      api.getWorkers().then((team) => {
        const self = user ? [{ id: user.id, name: user.name } as UserDTO] : [];
        setPeople([...self, ...team.filter((p) => p.id !== user?.id)]);
      });
    }
  }, [canSeeTeam, user?.id, user?.role]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleCheckIn() {
    setError("");
    setBusy(true);
    try {
      await api.checkIn();
      load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setError("");
    setBusy(true);
    try {
      await api.checkOut();
      load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  const sessionOpen = !!today?.checkIn && !today?.checkOut;
  const liveMinutes = sessionOpen
    ? (today?.workedMinutes ?? 0) + elapsedMinutesSince(today?.checkIn, clock)
    : today?.workedMinutes ?? 0;

  const dailyTotals = records.reduce<Record<string, number>>((acc, r) => {
    const key = r.date.slice(0, 10);
    const open = !!(r.checkIn && !r.checkOut);
    const mins = open
      ? (r.workedMinutes ?? 0) + elapsedMinutesSince(r.checkIn, clock)
      : r.workedMinutes ?? 0;
    acc[key] = (acc[key] ?? 0) + mins;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8" style={{ background: "#F8FAFC", minHeight: '100vh' }}>
      <AttendanceKeyframes />

      {/* Header */}
      <div className="mb-6" style={{ animation: "fadeUp 0.5s ease-out both" }}>
        <div className="flex items-center gap-3">
          <div 
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
            style={{ 
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
            }}
          >
            <FontAwesomeIcon icon={faClock} className="text-2xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
              Time tracking
            </h1>
            <p className="mt-0.5 text-sm flex items-center gap-2" style={{ color: "#64748B" }}>
              <FontAwesomeIcon icon={faCalendarDay} className="text-indigo-400 text-xs" />
              {clock.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        {canSeeTeam && (
          <div className="mt-4 max-w-xs">
            <select
              className="w-full rounded-2xl border bg-white px-4 py-2.5 text-sm"
              style={{ borderColor: "#E2E8F0" }}
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
            >
              <option value="">{user?.role === "ADMIN" ? "Everyone" : "Me and my team"}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Card */}
      <div 
        className="rounded-3xl bg-white border shadow-sm p-8 mb-6"
        style={{ borderColor: "#E2E8F0", animation: "fadeUp 0.5s ease-out both" }}
      >
        {/* Clock Display */}
        <div className="text-center mb-8">
          <div 
            className="font-mono text-6xl lg:text-7xl font-bold tracking-tight"
            style={{ 
              color: "#1A1D23",
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {clock.toLocaleTimeString()}
          </div>
          <div className="mt-2 text-sm flex items-center justify-center gap-2" style={{ color: "#94A3B8" }}>
            <FontAwesomeIcon icon={faCircle} className="text-[6px] text-emerald-400 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        {/* Stats Cards - Larger */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border bg-gray-50/50 px-6 py-5 text-center hover:shadow-md transition-shadow duration-200" style={{ borderColor: "#E2E8F0" }}>
            <div className="text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: "#94A3B8" }}>
              <FontAwesomeIcon icon={faArrowRightToBracket} className="text-emerald-500" />
              Check In
            </div>
            <div className="mt-2 font-mono text-xl font-bold" style={{ color: "#1A1D23" }}>
              {fmtTime(today?.checkIn ?? null)}
            </div>
          </div>
          <div className="rounded-2xl border bg-gray-50/50 px-6 py-5 text-center hover:shadow-md transition-shadow duration-200" style={{ borderColor: "#E2E8F0" }}>
            <div className="text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: "#94A3B8" }}>
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-red-500" />
              Check Out
            </div>
            <div className="mt-2 font-mono text-xl font-bold" style={{ color: "#1A1D23" }}>
              {fmtTime(today?.checkOut ?? null)}
            </div>
          </div>
          <div className="rounded-2xl border bg-gray-50/50 px-6 py-5 text-center hover:shadow-md transition-shadow duration-200" style={{ borderColor: "#E2E8F0" }}>
            <div className="text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: "#94A3B8" }}>
              <FontAwesomeIcon icon={faHourglass} className="text-indigo-500" />
              Hours worked
            </div>
            <div className="mt-2 font-mono text-xl font-bold" style={{ color: "#1A1D23" }}>
              {formatDurationMinutes(liveMinutes)}
            </div>
            {sessionOpen && (
              <div className="mt-1 text-[10px] uppercase tracking-wider" style={{ color: "#6366F1" }}>
                Live
              </div>
            )}
          </div>
        </div>

        {/* Buttons - Larger */}
        <div className="flex flex-wrap items-center justify-center gap-5">
          <button
            onClick={handleCheckIn}
            disabled={busy || sessionOpen}
            className={`flex items-center gap-3 rounded-2xl px-10 py-4 text-base font-semibold text-white shadow-md transition-colors duration-200 ${
              busy || sessionOpen ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'hover:shadow-lg hover:scale-[1.02]'
            }`}
            style={{
              background: busy || sessionOpen ? '#94A3B8' : 'linear-gradient(135deg, #10B981, #059669)',
            }}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="text-lg" />
            {busy && !sessionOpen ? "Processing..." : sessionOpen ? "Checked In ✓" : "Check In"}
          </button>
          <button
            onClick={handleCheckOut}
            disabled={busy || !sessionOpen}
            className={`flex items-center gap-3 rounded-2xl px-10 py-4 text-base font-semibold text-white shadow-md transition-colors duration-200 ${
              busy || !sessionOpen ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'hover:shadow-lg hover:scale-[1.02]'
            }`}
            style={{
              background: busy || !sessionOpen ? '#94A3B8' : 'linear-gradient(135deg, #EF4444, #DC2626)',
            }}
          >
            <FontAwesomeIcon icon={faTimesCircle} className="text-lg" />
            {busy && sessionOpen ? "Processing..." : sessionOpen ? "Check Out" : "Check Out"}
          </button>
        </div>

        <ErrorText message={error} />
      </div>

      {/* History Toggle */}
      <button
        className="group flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-medium transition-colors duration-200 hover:bg-white hover:shadow-md"
        style={{ color: "#6366F1", border: `1px solid #E2E8F0`, background: "rgba(255,255,255,0.5)" }}
        onClick={() => setShowHistory((s) => !s)}
      >
        <FontAwesomeIcon icon={faHistory} className="text-xs transition-transform duration-200 group-hover:rotate-12" />
        {showHistory ? "Hide History" : "View History"}
        <FontAwesomeIcon icon={faArrowRight} className={`text-xs transition-transform duration-200 ${showHistory ? 'rotate-90' : ''}`} />
      </button>

      {/* History Table */}
      {showHistory && (
        <div className="mt-4" style={{ animation: "fadeUp 0.4s ease-out both" }}>
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="h-12 w-12 animate-spin rounded-full border-4"
                  style={{ 
                    borderColor: '#E2E8F0',
                    borderTopColor: '#6366F1',
                  }}
                />
                <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading history...</p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed bg-white p-12 text-center" style={{ borderColor: "#E2E8F0" }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full mx-auto" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faHistory} className="text-2xl text-indigo-400" />
              </div>
              <p className="mt-3 text-sm font-medium" style={{ color: "#1A1D23" }}>No attendance records</p>
              <p className="text-xs" style={{ color: "#64748B" }}>Start tracking your attendance today</p>
            </div>
          ) : (
            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50" style={{ borderColor: "#E2E8F0" }}>
                      {canSeeTeam && (
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faUser} className="text-[10px] text-indigo-400" />
                            Employee
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faCalendarDay} className="text-[10px] text-indigo-400" />
                          Date
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faArrowRightToBracket} className="text-[10px] text-indigo-400" />
                          Check In
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-[10px] text-indigo-400" />
                          Check Out
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faChartBar} className="text-[10px] text-indigo-400" />
                          Hours worked
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faChartBar} className="text-[10px] text-indigo-400" />
                          Daily total
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faCircle} className="text-[10px] text-indigo-400" />
                          Status
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#E2E8F0" }}>
                    {records.map((r, index) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-gray-50/60"
                        style={{ animation: `slideIn 0.3s ease-out ${index * 30}ms both` }}
                      >
                        {canSeeTeam && (
                          <td className="px-4 py-3 font-medium" style={{ color: "#1A1D23" }}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ 
                                  background: `linear-gradient(135deg, #6366F1, #8B5CF6)`,
                                }}
                              >
                                {r.user?.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              {r.user?.name || "-"}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>
                          {formatDate(r.date)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "#1A1D23" }}>
                          {fmtTime(r.checkIn)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "#1A1D23" }}>
                          {fmtTime(r.checkOut)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: "#1A1D23" }}>
                          {formatDurationMinutes(
                            r.checkIn && !r.checkOut
                              ? (r.workedMinutes ?? 0) + elapsedMinutesSince(r.checkIn, clock)
                              : r.workedMinutes
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: "#1A1D23" }}>
                          {formatDurationMinutes(dailyTotals[r.date.slice(0, 10)] ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_BADGE[r.status]}>
                            <FontAwesomeIcon icon={STATUS_ICON[r.status]} className="mr-1.5 text-[9px]" />
                            {r.status.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}