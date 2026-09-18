import { useEffect, useRef, useState } from "react";
import type { AttendanceDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { formatDurationMinutes, elapsedMinutesSince } from "../lib/format";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClock, 
  faCheckCircle, 
  faTimesCircle, 
  faArrowRight,
  faCalendarDay,
  faUserClock,
  faCircle,
  faHistory,
  faRocket,
  faHourglassHalf
} from '@fortawesome/free-solid-svg-icons';

function fmtTime(t: string | null | undefined) {
  if (!t) return "-";
  return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AttendanceWidget() {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<AttendanceDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(new Date());
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    api.getTodayAttendance().then(setToday).catch(() => {});
  }
  useEffect(load, []);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const sessionOpen = !!today?.checkIn && !today?.checkOut;
  const liveMinutes = sessionOpen
    ? (today?.workedMinutes || 0) + elapsedMinutesSince(today?.checkIn, clock)
    : today?.workedMinutes || 0;

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

  const checkInDisabled = busy || sessionOpen;
  const checkOutDisabled = busy || !sessionOpen;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border-0 bg-none p-0 text-sm font-semibold text-white outline-none transition-all duration-200 hover:opacity-80"
        style={{ background: "none", border: "none" }}
      >
        <FontAwesomeIcon icon={faClock} className="text-base" />
        Time tracking
        {sessionOpen && (
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        )}
      </button>

      {open && (
        <div 
          className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border shadow-xl backdrop-blur-xl"
          style={{ 
            background: "rgba(255,255,255,0.95)",
            borderColor: "#E2E8F0",
            boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
            animation: "fadeDown 0.3s ease-out"
          }}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b" style={{ borderColor: "#E2E8F0" }}>
            <div className="flex items-center gap-2.5">
              <div 
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
              >
                <FontAwesomeIcon icon={faUserClock} className="text-sm text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#1A1D23" }}>
                  Today's hours
                </div>
                <div className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>
                  <FontAwesomeIcon icon={faCalendarDay} className="mr-1 text-[8px]" />
                  {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 px-4 py-3">
            <div className="rounded-xl border px-2 py-2.5 text-center transition-all duration-200 hover:shadow-sm" style={{ borderColor: "#E2E8F0" }}>
              <div className="text-[9px] font-medium uppercase tracking-wider flex items-center justify-center gap-1" style={{ color: "#94A3B8" }}>
                <FontAwesomeIcon icon={faCircle} className="text-[6px] text-emerald-400" />
                Check In
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold" style={{ color: today?.status === "LATE" ? "#D97706" : "#1A1D23" }}>
                {fmtTime(today?.checkIn)}
              </div>
              {today?.status === "LATE" && (
                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">Late</div>
              )}
            </div>
            <div className="rounded-xl border px-2 py-2.5 text-center transition-all duration-200 hover:shadow-sm" style={{ borderColor: "#E2E8F0" }}>
              <div className="text-[9px] font-medium uppercase tracking-wider flex items-center justify-center gap-1" style={{ color: "#94A3B8" }}>
                <FontAwesomeIcon icon={faCircle} className="text-[6px] text-red-400" />
                Check Out
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold" style={{ color: "#1A1D23" }}>
                {fmtTime(today?.checkOut)}
              </div>
            </div>
            <div className="rounded-xl border px-2 py-2.5 text-center transition-all duration-200 hover:shadow-sm" style={{ borderColor: "#E2E8F0" }}>
              <div className="text-[9px] font-medium uppercase tracking-wider flex items-center justify-center gap-1" style={{ color: "#94A3B8" }}>
                <FontAwesomeIcon icon={faHourglassHalf} className="text-[6px] text-indigo-400" />
                Hours
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold" style={{ color: "#1A1D23" }}>
                {formatDurationMinutes(liveMinutes)}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              <button
                onClick={handleCheckIn}
                disabled={checkInDisabled}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold tracking-tight text-white transition-all duration-200 ${
                  checkInDisabled 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'hover:shadow-lg hover:scale-[1.02] active:scale-95'
                }`}
                style={{
                  background: checkInDisabled ? '#94A3B8' : 'linear-gradient(135deg, #10B981, #059669)',
                }}
              >
                <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" />
                {busy && !sessionOpen ? "..." : sessionOpen ? "Checked In" : "Check In"}
              </button>
              <button
                onClick={handleCheckOut}
                disabled={checkOutDisabled}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold tracking-tight text-white transition-all duration-200 ${
                  checkOutDisabled 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'hover:shadow-lg hover:scale-[1.02] active:scale-95'
                }`}
                style={{
                  background: checkOutDisabled ? '#94A3B8' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                }}
              >
                <FontAwesomeIcon icon={faTimesCircle} className="text-[10px]" />
                {busy && sessionOpen ? "..." : "Check Out"}
              </button>
            </div>

            {error && (
              <p className="mt-2 text-xs text-center font-medium" style={{ color: "#EF4444" }}>
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5" style={{ borderColor: "#E2E8F0" }}>
            <a
              href="/attendance"
              className="flex items-center justify-center gap-1.5 text-xs font-medium transition-all duration-200 hover:opacity-70"
              style={{ color: "#6366F1" }}
            >
              <FontAwesomeIcon icon={faHistory} className="text-[10px]" />
              View full history
              <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
            </a>
          </div>
        </div>
      )}

      {/* Keyframes for animation */}
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}