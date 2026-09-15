import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt, 
  faChartBar, 
  faUsers, 
  faCalendarAlt, 
  faRocket,
  faArrowRight,
  faClock,
  faCheckCircle,
  faStar
} from '@fortawesome/free-solid-svg-icons';

function ReportsHomeKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
  );
}

export default function ReportsHome() {
  return (
    <div className="p-6 lg:p-8" style={{ background: "#F8FAFC", minHeight: '100vh' }}>
      <ReportsHomeKeyframes />

      {/* Header */}
      <div className="mb-8" style={{ animation: "fadeUp 0.5s ease-out both" }}>
        <div className="flex items-center gap-3">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
            style={{ 
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
            }}
          >
            <FontAwesomeIcon icon={faFileAlt} className="text-xl text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
              Reports
            </h1>
            <p className="mt-0.5 text-sm flex items-center gap-2" style={{ color: "#64748B" }}>
              <FontAwesomeIcon icon={faChartBar} className="text-indigo-400 text-xs" />
              Generate and download reports
            </p>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Link
          to="/reports/attendance"
          className="group rounded-3xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          style={{ borderColor: "#E2E8F0", animation: "scaleIn 0.5s ease-out both" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faCalendarAlt} className="text-2xl text-indigo-500" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-all duration-300 group-hover:bg-indigo-100">
              <FontAwesomeIcon icon={faArrowRight} className="text-sm text-gray-400 transition-all duration-300 group-hover:text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-bold" style={{ color: "#1A1D23" }}>Time tracking report</h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Monthly hours plus present, absent, and leave breakdown per person
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1" style={{ color: "#94A3B8" }}>
                <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                Monthly
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="flex items-center gap-1" style={{ color: "#94A3B8" }}>
                <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
                Per employee
              </span>
            </div>
          </div>
        </Link>

        <Link
          to="/reports/performance"
          className="group rounded-3xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          style={{ borderColor: "#E2E8F0", animation: "scaleIn 0.5s ease-out 0.1s both" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#D1FAE5" }}>
              <FontAwesomeIcon icon={faStar} className="text-2xl text-emerald-500" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-all duration-300 group-hover:bg-indigo-100">
              <FontAwesomeIcon icon={faArrowRight} className="text-sm text-gray-400 transition-all duration-300 group-hover:text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-bold" style={{ color: "#1A1D23" }}>Performance Report</h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Task completion, rework rate, and on-time delivery
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1" style={{ color: "#94A3B8" }}>
                <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                Monthly
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="flex items-center gap-1" style={{ color: "#94A3B8" }}>
                <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" />
                Task metrics
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}