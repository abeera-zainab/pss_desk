import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PerformanceReportDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { Spinner, ErrorText } from "../components/ui";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faFileAlt, 
  faUsers, 
  faCalendarAlt, 
  faDownload,
  faFilePdf,
  faFileExcel,
  faSearch,
  faFilter,
  faChartBar,
  faUser,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faStar,
  faRocket,
  faAward,
  faBullseye,
  faThumbsUp,
  faCircle,
  faArrowUp
} from '@fortawesome/free-solid-svg-icons';

function ReportsPerformanceKeyframes() {
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
    `}</style>
  );
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPerformance() {
  const [month, setMonth] = useState(currentMonth());
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<PerformanceReportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api
      .getPerformanceReport({ month, userId: selectedUserId || undefined })
      .then((data) => {
        setReport(data);
        if (!selectedUserId) {
          setPeople(data.data.map((row) => ({ id: row.userId, name: row.name })));
        }
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, [month, selectedUserId]);

  const filteredData = report?.data.filter((row) =>
    row.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8" style={{ background: "#F8FAFC", minHeight: '100vh' }}>
      <ReportsPerformanceKeyframes />

      {/* Back Button */}
      <Link 
        to="/reports" 
        className="group inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-white hover:shadow-md"
        style={{ color: "#64748B", border: `1px solid #E2E8F0`, background: "rgba(255,255,255,0.5)" }}
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-xs transition-transform duration-200 group-hover:-translate-x-1" />
        Back to Reports
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6" style={{ animation: "fadeUp 0.5s ease-out both" }}>
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
                <FontAwesomeIcon icon={faStar} className="text-xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
                  Performance Report
                </h1>
                <p className="mt-0.5 text-sm flex items-center gap-2" style={{ color: "#64748B" }}>
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-indigo-400 text-xs" />
                  {month.replace('-', ' ')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <>
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "#94A3B8" }}
                  />
                  <input
                    className="rounded-2xl border bg-white px-3 py-2 pl-8 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    style={{ borderColor: "#E2E8F0", width: '160px' }}
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="rounded-2xl border bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  style={{ borderColor: "#E2E8F0", width: '180px' }}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">All employees</option>
                  {people.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </>
            <input
              type="month"
              className="rounded-2xl border bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              style={{ borderColor: "#E2E8F0", width: '160px' }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <button
              className="flex items-center gap-1.5 rounded-2xl border bg-white px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-50"
              style={{ borderColor: "#E2E8F0", color: "#64748B" }}
              onClick={() => api.downloadReport("performance", "pdf", { month, userId: selectedUserId || undefined })}
            >
              <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
              PDF
            </button>
            <button
              className="flex items-center gap-1.5 rounded-2xl border bg-white px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-50"
              style={{ borderColor: "#E2E8F0", color: "#64748B" }}
              onClick={() => api.downloadReport("performance", "xlsx", { month, userId: selectedUserId || undefined })}
            >
              <FontAwesomeIcon icon={faFileExcel} className="text-green-500" />
              Excel
            </button>
          </div>
        </div>
      </div>

      <ErrorText message={error} />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="h-12 w-12 animate-spin rounded-full border-4"
              style={{ 
                borderColor: '#E2E8F0',
                borderTopColor: '#6366F1',
              }}
            />
            <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading report...</p>
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
                      <FontAwesomeIcon icon={faCheckCircle} className="text-[10px] text-emerald-400" />
                      Completed
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faTimesCircle} className="text-[10px] text-red-400" />
                      Rejected
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faArrowUp} className="text-[10px] text-amber-400" />
                      Rework %
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faClock} className="text-[10px] text-indigo-400" />
                      Avg Days
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBullseye} className="text-[10px] text-emerald-400" />
                      On-Time %
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#E2E8F0" }}>
                {(!filteredData || filteredData.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "#64748B" }}>
                      No performance data for this period.
                    </td>
                  </tr>
                )}
                {filteredData?.map((row, index) => (
                  <tr 
                    key={row.userId} 
                    className="hover:bg-gray-50/60"
                    style={{ animation: `slideIn 0.3s ease-out ${index * 30}ms both` }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "#1A1D23" }}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ 
                            background: `linear-gradient(135deg, #6366F1, #8B5CF6)`,
                          }}
                        >
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        {row.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#10B981" }}>
                      {row.tasksCompleted}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#EF4444" }}>
                      {row.tasksRejected}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${row.reworkRate > 10 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {row.reworkRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#64748B" }}>
                      {row.avgDaysToComplete}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${row.onTimePercent >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {row.onTimePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}