import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CaseDTO, Priority, TaskType, UserDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { useAuth } from "../store/auth";
import { Badge, Modal, ErrorText, Spinner, EmptyState } from "../components/ui";
import { CASE_STATUS_BADGE, PRIORITY_BADGE } from "../lib/meta";
import { formatDate } from "../lib/format";
import { colors, card, label, input, heading } from "../lib/theme";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faFolderOpen,
  faTasks,
  faCalendarAlt,
  faUser,
  faClock,
  faRocket,
  faFire,
  faChartBar,
  faTag,
  faFileAlt,
  faUsers,
  faUserTie,
  faArrowRight,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faThumbsUp,
  faStar,
  faGem,
  faBolt,
  faTrash
} from "@fortawesome/free-solid-svg-icons";

function CasesKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
        50% { box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.15); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  );
}

export default function Cases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setLoading(true);
    api
      .getCases({ limit: 100 })
      .then((response) => {
        let data: any = response;
        if (response && typeof response === "object" && "data" in response && Array.isArray((response as any).data)) {
          data = (response as any).data;
        } else if (Array.isArray(response)) {
          data = response;
        }
        setCases(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Error loading cases:", e);
        setCases([]);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const totalCases = cases.length;
  const activeCases = cases.filter((c) => {
    if (!c.status) return false;
    const status = c.status.toUpperCase();
    return status !== "CLOSED" && status !== "REJECTED";
  }).length;
  const urgentCases = cases.filter((c) => c.priority === "URGENT").length;
  const completedCases = cases.filter((c) => c.status === "COMPLETED").length;

  
  async function handleDeleteCase(c: CaseDTO, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete case "${c.title}"? This action cannot be undone.`)) {
      try {
        await api.deleteCase(c.id);
        load(); // Refresh the list
      } catch (err) {
        alert(apiError(err));
      }
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: "#F8FAFC" }}>
      <CasesKeyframes />

      <div className="mb-6 sm:mb-8" style={{ animation: "fadeUp 0.6s ease-out both" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg sm:h-14 sm:w-14"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
                animation: "pulseGlow 3s ease-in-out infinite"
              }}
            >
              <FontAwesomeIcon icon={faFolderOpen} className="text-xl text-white sm:text-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl" style={{ color: "#1A1D23" }}>
                {user?.role === "ADMIN" ? "Case Management" : "My Cases"}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm" style={{ color: "#64748B" }}>
                <FontAwesomeIcon icon={faFire} className="text-orange-400" />
                <span>{totalCases} total cases</span>
                <span className="hidden sm:inline">·</span>
                <span>{activeCases} active</span>
                <span className="hidden sm:inline">·</span>
                <span>{urgentCases} urgent</span>
              </p>
            </div>
          </div>

          {user?.role === "ADMIN" && (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 sm:w-auto sm:px-6 sm:py-3"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)" }}
              onClick={() => setShowCreate(true)}
            >
              <FontAwesomeIcon icon={faPlus} className="transition-transform duration-300 group-hover:rotate-90" />
              New Case
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
          {/* Stats cards */}
          <div
            className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:px-4 sm:py-3"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faFolderOpen} className="text-xs text-indigo-500 sm:text-base" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-medium uppercase tracking-wider text-gray-400 sm:text-[10px]">Total</span>
              <p className="truncate text-sm font-bold sm:text-lg" style={{ color: "#1A1D23" }}>
                {totalCases}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:px-4 sm:py-3"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10" style={{ background: "#D1FAE5" }}>
              <FontAwesomeIcon icon={faCheckCircle} className="text-xs text-green-500 sm:text-base" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-medium uppercase tracking-wider text-gray-400 sm:text-[10px]">Active</span>
              <p className="truncate text-sm font-bold sm:text-lg" style={{ color: "#10B981" }}>
                {activeCases}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:px-4 sm:py-3"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10" style={{ background: "#FEE2E2" }}>
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs text-red-500 sm:text-base" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-medium uppercase tracking-wider text-gray-400 sm:text-[10px]">Urgent</span>
              <p className="truncate text-sm font-bold sm:text-lg" style={{ color: "#EF4444" }}>
                {urgentCases}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:px-4 sm:py-3"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10" style={{ background: "#DBEAFE" }}>
              <FontAwesomeIcon icon={faTasks} className="text-xs text-blue-500 sm:text-base" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-medium uppercase tracking-wider text-gray-400 sm:text-[10px]">Completed</span>
              <p className="truncate text-sm font-bold sm:text-lg" style={{ color: "#3B82F6" }}>
                {completedCases}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-12 w-12 animate-spin rounded-full border-4 sm:h-16 sm:w-16"
              style={{ borderColor: "#E2E8F0", borderTopColor: "#6366F1", boxShadow: "0 0 60px rgba(99, 102, 241, 0.1)" }}
            />
            <p className="text-sm font-medium" style={{ color: "#64748B" }}>
              Loading cases...
            </p>
          </div>
        </div>
      ) : cases.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50/20 sm:p-16"
          style={{ borderColor: "#E2E8F0" }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24" style={{ background: "#EEF2FF" }}>
            <FontAwesomeIcon icon={faFolderOpen} className="text-4xl sm:text-5xl" style={{ color: "#6366F1" }} />
          </div>
          <p className="mt-4 text-lg font-semibold" style={{ color: "#1A1D23" }}>
            No cases yet
          </p>
          <p className="text-center text-sm" style={{ color: "#64748B" }}>
            Create your first case to get started
          </p>
          {user?.role === "ADMIN" && (
            <button
              className="mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 24px rgba(99, 102, 241, 0.3)" }}
              onClick={() => setShowCreate(true)}
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Case
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {cases.map((c, index) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="group relative overflow-hidden rounded-3xl border bg-white p-4 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl sm:p-5"
              style={{ borderColor: "#E2E8F0", animation: `fadeUp 0.5s ease-out ${index * 80}ms both` }}
            >
              <div
                className="absolute left-0 right-0 top-0 h-1 rounded-t-3xl"
                style={{
                  background: `linear-gradient(90deg, ${
                    c.priority === "URGENT" ? "#EF4444" : c.priority === "HIGH" ? "#F59E0B" : c.priority === "MEDIUM" ? "#6366F1" : "#10B981"
                  }, ${
                    c.priority === "URGENT" ? "#DC2626" : c.priority === "HIGH" ? "#D97706" : c.priority === "MEDIUM" ? "#4F46E5" : "#059669"
                  })`
                }}
              />

              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-medium" style={{ color: "#94A3B8" }}>
                      {c.caseNumber}
                    </span>
                    <span
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{
                        background:
                          c.priority === "URGENT" ? "#EF4444" : c.priority === "HIGH" ? "#F59E0B" : c.priority === "MEDIUM" ? "#6366F1" : "#10B981",
                        animation: c.priority === "URGENT" ? "pulseGlow 2s ease-in-out infinite" : "none"
                      }}
                    />
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-sm font-bold tracking-tight sm:text-base" style={{ color: "#1A1D23" }}>
                    {c.title}
                  </div>
                </div>
                <Badge className={CASE_STATUS_BADGE[c.status] + " flex-shrink-0 px-2 py-0.5 text-[8px] sm:text-[10px]"}>
                  {c.status.replaceAll("_", " ")}
                </Badge>
              </div>

              <p className="mt-2 line-clamp-2 text-xs leading-relaxed sm:text-sm" style={{ color: "#64748B" }}>
                {c.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] sm:gap-2 sm:text-xs" style={{ color: "#94A3B8" }}>
                <Badge className={PRIORITY_BADGE[c.priority] + " px-2 py-0.5 text-[8px] sm:text-[10px]"}>
                  <FontAwesomeIcon icon={faTag} className="mr-0.5 text-[6px] sm:mr-1 sm:text-[8px]" />
                  {c.priority}
                </Badge>
                <span className="flex items-center gap-0.5 rounded-full bg-slate-50 px-1.5 py-0.5 sm:gap-1 sm:px-2">
                  <FontAwesomeIcon icon={faUserTie} className="text-[8px] text-indigo-400 sm:text-[10px]" />
                  <span className="max-w-[50px] truncate text-[8px] sm:max-w-none sm:text-[10px]">
                    {c.assignedManager?.name ?? "-"}
                  </span>
                </span>
                <span className="flex items-center gap-0.5 rounded-full bg-slate-50 px-1.5 py-0.5 sm:gap-1 sm:px-2">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-[8px] text-indigo-400 sm:text-[10px]" />
                  <span className="text-[8px] sm:text-[10px]">{formatDate(c.deadline)}</span>
                </span>
                <span className="flex items-center gap-0.5 rounded-full bg-slate-50 px-1.5 py-0.5 sm:gap-1 sm:px-2">
                  <FontAwesomeIcon icon={faTasks} className="text-[8px] text-indigo-400 sm:text-[10px]" />
                  <span className="text-[8px] sm:text-[10px]">{c.tasks?.length ?? 0} tasks</span>
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {c.priority === "URGENT" && (
                    <span className="flex items-center gap-0.5 text-[8px] font-medium text-red-500 sm:text-[9px]">
                      <FontAwesomeIcon icon={faBolt} className="text-[8px] sm:text-[10px]" />
                      <span className="hidden xs:inline">Urgent</span>
                    </span>
                  )}
                  {c.status === "COMPLETED" && (
                    <span className="flex items-center gap-0.5 text-[8px] font-medium text-green-500 sm:text-[9px]">
                      <FontAwesomeIcon icon={faThumbsUp} className="text-[8px] sm:text-[10px]" />
                      <span className="hidden xs:inline">Completed</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Delete button, admin only */}
                  {user?.role === "ADMIN" && (
                    <button
                      onClick={(e) => handleDeleteCase(c, e)}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition-all duration-300 hover:scale-110 hover:bg-red-100 sm:h-8 sm:w-8"
                      title="Delete case"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs sm:text-sm" />
                    </button>
                  )}
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-100 sm:h-8 sm:w-8">
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-xs text-slate-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-indigo-600 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCaseModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "FR" as TaskType, label: "Face Recognition (FR)" },
  { value: "GEO_LOCATION" as TaskType, label: "Geo Location" },
  { value: "CYBER_INT" as TaskType, label: "Cyber Intelligence" }
];

interface DraftTask {
  key: string;
  taskType: TaskType;
  title: string;
  description: string;
  assignedUserIds: string[];
  priority: Priority;
  deadline: string;
}

function CreateCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [managers, setManagers] = useState<UserDTO[]>([]);
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM" as Priority);
  const [assignedManagerId, setAssignedManagerId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [docs, setDocs] = useState("");
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getManagers().then((m) => {
      setManagers(m);
      if (m[0]) setAssignedManagerId(m[0].id);
    });
    api.getWorkers().then(setWorkers);
  }, []);

  function addTask() {
    setTasks((prev) => [
      ...prev,
      {
        key: Math.random().toString(36).slice(2),
        taskType: "FR" as TaskType,
        title: "",
        description: "",
        assignedUserIds: workers[0]?.id ? [workers[0].id] : [],
        priority: "MEDIUM" as Priority,
        deadline: ""
      }
    ]);
  }

  function updateTask(key: string, patch: Partial<DraftTask>) {
    setTasks((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function removeTask(key: string) {
    setTasks((prev) => prev.filter((t) => t.key !== key));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const invalidTask = tasks.find((t) => !t.title || t.assignedUserIds.length === 0 || !t.deadline);
    if (invalidTask) {
      setError("Every task needs a title, at least one assigned worker, and a deadline.");
      return;
    }

    setSaving(true);
    try {
      await api.createCase({
        title,
        description,
        priority,
        assignedManagerId,
        deadline: new Date(deadline).toISOString(),
        requiredDocuments: docs.split("\n").map((d) => d.trim()).filter(Boolean),
        tasks: tasks.map((t) => ({
          taskType: t.taskType,
          title: t.title,
          description: t.description || t.title,
          assignedUserId: t.assignedUserIds[0],
          assignedUserIds: t.assignedUserIds,
          priority: t.priority,
          deadline: new Date(t.deadline).toISOString()
        }))
      });
      onCreated();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Case" onClose={onClose} wide>
      <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent max-h-[70vh] overflow-y-auto pr-1">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {/* ... rest of the form stays the same ... */}
          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg sm:h-6 sm:w-6" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faFileAlt} className="text-[10px] text-indigo-500 sm:text-xs" />
              </div>
              Title
            </span>
            <input
              className={`${input} mt-1.5 rounded-xl border-gray-200 text-sm transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-base`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Enter case title..."
            />
          </label>

          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg sm:h-6 sm:w-6" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faTasks} className="text-[10px] text-indigo-500 sm:text-xs" />
              </div>
              Description
            </span>
            <textarea
              className={`${input} mt-1.5 min-h-[70px] rounded-xl border-gray-200 text-sm transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:min-h-[80px] sm:text-base`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Describe the case details..."
            />
          </label>

          <label className={`${label} col-span-1`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg sm:h-6 sm:w-6" style={{ background: "#FEF3C7" }}>
                <FontAwesomeIcon icon={faFire} className="text-[10px] text-amber-500 sm:text-xs" />
              </div>
              Priority
            </span>
            <select
              className={`${input} mt-1.5 rounded-xl border-gray-200 text-sm transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-base`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className={`${label} col-span-1`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg sm:h-6 sm:w-6" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faUserTie} className="text-[10px] text-indigo-500 sm:text-xs" />
              </div>
              Manager
            </span>
            <select
              className={`${input} mt-1.5 rounded-xl border-gray-200 text-sm transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-base`}
              value={assignedManagerId}
              onChange={(e) => setAssignedManagerId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a manager…
              </option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg sm:h-6 sm:w-6" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px] text-indigo-500 sm:text-xs" />
              </div>
              Deadline
            </span>
            <input
              className={`${input} mt-1.5 rounded-xl border-gray-200 text-sm transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-base`}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </label>

          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg sm:h-6 sm:w-6" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faFileAlt} className="text-[10px] text-indigo-500 sm:text-xs" />
              </div>
              Required Documents
            </span>
            <textarea
              className={`${input} mt-1.5 min-h-[60px] rounded-xl border-gray-200 text-sm transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:min-h-[70px] sm:text-base`}
              value={docs}
              onChange={(e) => setDocs(e.target.value)}
              placeholder={"Signed contract (PDF)\nID verification"}
            />
            <span className="mt-1 text-[10px]" style={{ color: "#94A3B8" }}>
              One per line
            </span>
          </label>

          <div className="col-span-1 rounded-2xl border p-3 sm:col-span-2 sm:p-4" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg sm:h-6 sm:w-6" style={{ background: "#EEF2FF" }}>
                  <FontAwesomeIcon icon={faRocket} className="text-[10px] text-indigo-500 sm:text-xs" />
                </div>
                Tasks for this case ({tasks.length})
              </span>
              <button
                type="button"
                onClick={addTask}
                disabled={!workers.length}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                Add task
              </button>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs" style={{ color: "#94A3B8" }}>
                No tasks yet - add FR / Geo Location / Cyber Intelligence tasks here, or skip and add them later.
              </p>
            ) : (
              <div className="max-h-[200px] space-y-3 overflow-y-auto pr-1">
                {tasks.map((t) => (
                  <div key={t.key} className="rounded-xl border bg-white p-3" style={{ borderColor: "#E2E8F0" }}>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
                      <input
                        className={`${input} col-span-1 rounded-lg text-sm sm:col-span-2`}
                        placeholder="Task title..."
                        value={t.title}
                        onChange={(e) => updateTask(t.key, { title: e.target.value })}
                      />
                      <select
                        className={`${input} rounded-lg text-sm`}
                        value={t.taskType}
                        onChange={(e) => updateTask(t.key, { taskType: e.target.value as TaskType })}
                      >
                        {TASK_TYPES.map((tt) => (
                          <option key={tt.value} value={tt.value}>
                            {tt.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className={`${input} rounded-lg text-sm`}
                        value={t.priority}
                        onChange={(e) => updateTask(t.key, { priority: e.target.value as Priority })}
                      >
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                      
                      {/* Multi-select for workers */}
                      <div className="col-span-1 sm:col-span-2">
                        <div className="text-xs font-medium mb-1" style={{ color: "#64748B" }}>
                          Assigned Workers ({t.assignedUserIds.length})
                        </div>
                        <div className="grid grid-cols-1 gap-1 max-h-[80px] overflow-y-auto p-1 border rounded-lg" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
                          {workers.map((w) => {
                            const isSelected = t.assignedUserIds.includes(w.id);
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  const newUserIds = isSelected
                                    ? t.assignedUserIds.filter(id => id !== w.id)
                                    : [...t.assignedUserIds, w.id];
                                  if (newUserIds.length === 0) {
                                    setError("At least one worker must be assigned.");
                                    return;
                                  }
                                  setError("");
                                  updateTask(t.key, { assignedUserIds: newUserIds });
                                }}
                                className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-all duration-200 ${
                                  isSelected 
                                    ? "bg-indigo-100 text-indigo-700 border-indigo-300" 
                                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                }`}
                                style={{ border: `1px solid ${isSelected ? "#6366F1" : "#E2E8F0"}` }}
                              >
                                <div 
                                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all duration-200 ${
                                    isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-white text-[6px]" />
                                  )}
                                </div>
                                <span className="truncate">{w.name}</span>
                                {isSelected && t.assignedUserIds.indexOf(w.id) === 0 && (
                                  <span className="ml-auto text-[8px] font-medium text-indigo-600">Lead</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      <input
                        className={`${input} col-span-1 rounded-lg text-sm sm:col-span-2`}
                        type="date"
                        value={t.deadline}
                        onChange={(e) => updateTask(t.key, { deadline: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTask(t.key)}
                      className="mt-2 text-[11px] font-medium text-red-500 hover:underline"
                    >
                      Remove task
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-1 sm:col-span-2">
            <ErrorText message={error} />
          </div>

          <div className="col-span-1 sticky bottom-0 flex flex-col items-center gap-3 border-t border-gray-100 bg-white py-3 sm:col-span-2 sm:flex-row">
            <button
              className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 transition-all duration-300 hover:bg-gray-200 active:scale-95 sm:flex-1"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              type="submit"
              disabled={saving || !managers.length}
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 24px rgba(99, 102, 241, 0.3)" }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faRocket} />
                  Create Case
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}