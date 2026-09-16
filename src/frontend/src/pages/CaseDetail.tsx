import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CaseDTO, Priority, TaskDTO, TaskType, UserDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { useAuth } from "../store/auth";
import { Badge, Modal, ErrorText, Spinner, EmptyState } from "../components/ui";
import { CASE_STATUS_BADGE, PRIORITY_BADGE, TASK_STATUS_BADGE, TASK_STATUS_LABEL } from "../lib/meta";
import { formatDate } from "../lib/format";
import { card, label, input, btn, btnDark, heading, eyebrow, link, colors } from "../lib/theme";
import CaseBoard from "./CaseBoard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFileAlt,
  faTasks,
  faUserTie,
  faCalendarAlt,
  faPlus,
  faRocket,
  faTag,
  faUsers,
  faCheckCircle,
  faLink as faLinkIcon,
  faFire,
  faArrowRight,
  faFileInvoice
} from "@fortawesome/free-solid-svg-icons";

function CaseDetailKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.1); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes popIn {
        0% { transform: scale(0.8); opacity: 0; }
        60% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  );
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [kase, setKase] = useState<CaseDTO | null>(null);
  const [error, setError] = useState("");
  const [showTask, setShowTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    api.getCase(id)
      .then((data) => {
        setKase(data);
        setError("");
      })
      .catch((e) => {
        setError(apiError(e));
        console.error("Error loading case:", e);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  const canManage = !!kase && (
    user?.role === "ADMIN" ||
    (user?.role === "MANAGER" && kase.assignedManagerId === user.id)
  );

  // For creating tasks
  const canCreateTask = !!kase && (
    user?.role === "ADMIN" || 
    (user?.role === "MANAGER" && kase.assignedManagerId === user.id)
  );

  if (error) return <ErrorText message={error} />;
  if (loading || !kase) return <Spinner />;

  return (
    <div className="max-w-full p-6 lg:p-8" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      <CaseDetailKeyframes />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4" style={{ animation: "fadeUp 0.5s ease-out both" }}>
        <Link
          to="/cases"
          className="group inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all duration-300 hover:bg-white hover:shadow-md active:scale-95"
          style={{ color: "#64748B", border: "1px solid #E2E8F0", background: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#6366F1";
            e.currentTarget.style.borderColor = "#6366F1";
            e.currentTarget.style.background = "#EEF2FF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#64748B";
            e.currentTarget.style.borderColor = "#E2E8F0";
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs transition-transform duration-300 group-hover:-translate-x-1" />
          Back to Cases
        </Link>

        {canManage && (
          <button
            className="group inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)" }}
            onClick={() => api.downloadCaseReport(kase.id, kase.caseNumber)}
          >
            <FontAwesomeIcon icon={faFileInvoice} className="text-sm transition-transform duration-300 group-hover:-translate-y-0.5" />
            Generate Report
          </button>
        )}
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: "#E2E8F0", animation: "fadeUp 0.5s ease-out both" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="font-mono text-xs font-medium" style={{ color: "#94A3B8" }}>
                {kase.caseNumber}
              </div>
              <Badge className={CASE_STATUS_BADGE[kase.status]}>{kase.status.replaceAll("_", " ")}</Badge>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight lg:text-3xl" style={{ color: "#1A1D23" }}>
              {kase.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#64748B" }}>
              {kase.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={PRIORITY_BADGE[kase.priority]}>
              <FontAwesomeIcon icon={faTag} className="mr-1 text-[10px]" />
              {kase.priority}
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4" style={{ borderColor: "#E2E8F0" }}>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faUserTie} className="text-[10px] text-indigo-500" />
            </div>
            Manager: {kase.assignedManager?.name ?? "-"}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px] text-indigo-500" />
            </div>
            Due: {formatDate(kase.deadline)}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faTasks} className="text-[10px] text-indigo-500" />
            </div>
            Tasks: {kase.tasks?.length ?? 0}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {kase.requiredDocuments?.length > 0 && (
            <div
              className="rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md"
              style={{ borderColor: "#E2E8F0", animation: "fadeUp 0.5s ease-out 0.1s both" }}
            >
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                  <FontAwesomeIcon icon={faFileAlt} className="text-indigo-500" />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: "#1A1D23" }}>
                  Required Documents
                </h2>
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs" style={{ background: "#EEF2FF", color: "#6366F1" }}>
                  {kase.requiredDocuments.length}
                </span>
              </div>
              <div className="grid gap-2">
                {kase.requiredDocuments.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm transition-all duration-300 hover:translate-x-1 hover:bg-indigo-50"
                    style={{ color: "#1A1D23", animation: `slideIn 0.3s ease-out ${i * 50}ms both` }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                      <FontAwesomeIcon icon={faFileAlt} className="text-[10px] text-indigo-500" />
                    </div>
                    <span className="flex-1">{d}</span>
                    <FontAwesomeIcon icon={faCheckCircle} className="text-[10px] text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          )}


          <div style={{ animation: "fadeUp 0.5s ease-out 0.2s both" }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                  <FontAwesomeIcon icon={faTasks} className="text-indigo-500" />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: "#1A1D23" }}>
                  Tasks
                </h2>
                <span className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: "#EEF2FF", color: "#6366F1" }}>
                  {kase.tasks?.length ?? 0}
                </span>
              </div>
              {canCreateTask && (
                <button
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)" }}
                  onClick={() => setShowTask(true)}
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                  New Task
                </button>
              )}
            </div>

            {!kase.tasks || kase.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#EEF2FF" }}>
                  <FontAwesomeIcon icon={faTasks} className="text-2xl text-indigo-500" />
                </div>
                <p className="mt-3 text-sm font-medium" style={{ color: "#1A1D23" }}>
                  No tasks yet
                </p>
                <p className="text-xs" style={{ color: "#64748B" }}>
                  Create a task to get started
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {kase.tasks.map((t, index) => {
                  // Get assigned users from assignments
                  const assignedUsers = t.assignments?.map((a: any) => a.user) || [];
                  
                  return (
                    <Link
                      key={t.id}
                      to={`/tasks/${t.id}`}
                      className="group block rounded-2xl border bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                      style={{ borderColor: "#E2E8F0", animation: `fadeUp 0.3s ease-out ${index * 60}ms both` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-medium" style={{ color: "#94A3B8" }}>
                              {t.referenceId}
                            </span>
                            <Badge className={TASK_STATUS_BADGE[t.status]}>{TASK_STATUS_LABEL[t.status]}</Badge>
                          </div>
                          <div className="mt-0.5 truncate text-sm font-semibold" style={{ color: "#1A1D23" }}>
                            {t.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px]" style={{ color: "#64748B" }}>
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faUsers} className="text-[8px] text-indigo-400" />
                              {assignedUsers.length > 0 ? (
                                <span>
                                  {assignedUsers.slice(0, 2).map((u: any) => u.name).join(', ')}
                                  {assignedUsers.length > 2 && ` +${assignedUsers.length - 2} more`}
                                </span>
                              ) : (
                                t.assignedUser?.name ?? "Unassigned"
                              )}
                            </span>
                            {t.deadline && (
                              <span className="flex items-center gap-1">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-[8px] text-indigo-400" />
                                {formatDate(t.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={PRIORITY_BADGE[t.priority]}>
                            <FontAwesomeIcon icon={faTag} className="mr-0.5 text-[6px]" />
                            {t.priority}
                          </Badge>
                          {canManage && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingTask(t);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 hover:scale-110 hover:bg-indigo-100"
                              title="Edit task"
                            >
                              ✎
                            </button>
                          )}
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-100">
                            <FontAwesomeIcon
                              icon={faArrowRight}
                              className="text-[10px] text-slate-400 transition-all duration-300 group-hover:text-indigo-600"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6" style={{ animation: "fadeUp 0.5s ease-out 0.25s both" }}>
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faRocket} className="text-indigo-500" />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "#1A1D23" }}>
                Board
              </h2>
              <span className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: "#EEF2FF", color: "#6366F1" }}>
                {kase.files?.length ?? 0} items
              </span>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md" style={{ borderColor: "#E2E8F0" }}>
              <CaseBoard caseId={kase.id} />
            </div>
          </div>
        </div>
      </div>

      {showTask && (
        <CreateTaskModal
          caseId={kase.id}
          existingTasks={kase.tasks || []}
          onClose={() => setShowTask(false)}
          onCreated={() => {
            setShowTask(false);
            load();
          }}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// CreateTaskModal with multi-select
function CreateTaskModal({
  caseId,
  existingTasks,
  onClose,
  onCreated
}: {
  caseId: string;
  existingTasks: TaskDTO[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("FR" as TaskType);
  const [priority, setPriority] = useState<Priority>("MEDIUM" as Priority);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [dependsOnTaskId, setDependsOnTaskId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getWorkers().then((w) => {
      setWorkers(w);
      if (w.length > 0) {
        setAssignedUserIds([w[0].id]);
      }
    });
  }, []);

  function toggleWorkerSelection(userId: string) {
    setAssignedUserIds(prev => {
      if (prev.includes(userId)) {
        if (prev.length === 1) {
          setError("At least one worker must be assigned.");
          return prev;
        }
        return prev.filter(id => id !== userId);
      } else {
        setError("");
        return [...prev, userId];
      }
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (assignedUserIds.length === 0) {
      setError("Please assign at least one worker.");
      return;
    }

    if (!title.trim() || !description.trim() || !deadline) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      // Create task with first worker as primary
      const task = await api.createTask({
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim() || undefined,
        taskType,
        priority,
        assignedUserId: assignedUserIds[0],
        caseId,
        dependsOnTaskId: dependsOnTaskId || undefined,
        deadline: new Date(deadline).toISOString()
      });

      // Attach the rest of the team in one call. Looping assignTask here was
      // wrong twice over: that endpoint *replaces* the primary assignee rather
      // than adding to the team, so the last worker picked silently became the
      // lead, and every iteration fired another TASK_ASSIGNED notification and
      // task:updated broadcast.
      if (assignedUserIds.length > 1) {
        try {
          await api.assignMultipleUsers(task.id, assignedUserIds);
        } catch (e) {
          setError(`Task created, but assigning the full team failed: ${apiError(e)}`);
        }
      }

      onCreated();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Task" onClose={onClose} wide>
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Title */}
          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faFileAlt} className="text-xs text-indigo-500" />
              </div>
              Title
            </span>
            <input
              className={`${input} mt-1.5 rounded-xl border-gray-200 transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Enter task title..."
            />
          </label>

          {/* Description */}
          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faTasks} className="text-xs text-indigo-500" />
              </div>
              Description
            </span>
            <textarea
              className={`${input} mt-1.5 min-h-[60px] rounded-xl border-gray-200 transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Describe the task..."
            />
          </label>

          {/* Instructions */}
          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faFileAlt} className="text-xs text-indigo-500" />
              </div>
              Instructions (optional)
            </span>
            <textarea
              className={`${input} mt-1.5 min-h-[60px] rounded-xl border-gray-200 transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm`}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Provide instructions..."
            />
          </label>

          {/* Task Type */}
          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faRocket} className="text-xs text-indigo-500" />
              </div>
              Task Type
            </span>
            <select
              className={`${input} mt-1.5 rounded-xl border-gray-200 transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm`}
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
            >
              <option value="FR">Face Recognition (FR)</option>
              <option value="GEO_LOCATION">Geo Location</option>
              <option value="CYBER_INT">Cyber Intelligence</option>
            </select>
          </label>

          {/* Priority */}
          <label className={label}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#FEF3C7" }}>
                <FontAwesomeIcon icon={faFire} className="text-xs text-amber-500" />
              </div>
              Priority
            </span>
            <select
              className={`${input} mt-1.5 rounded-xl border-gray-200 transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>

          {/* Deadline */}
          <label className={label}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faCalendarAlt} className="text-xs text-indigo-500" />
              </div>
              Deadline
            </span>
            <input
              className={`${input} mt-1.5 rounded-xl border-gray-200 transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm`}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </label>

          {/* Depends On */}
          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faLinkIcon} className="text-xs text-indigo-500" />
              </div>
              Depends On
            </span>
            <select
              className={`${input} mt-1.5 rounded-xl border-gray-200 transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm`}
              value={dependsOnTaskId}
              onChange={(e) => setDependsOnTaskId(e.target.value)}
            >
              <option value="">None</option>
              {existingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>

          {/* Multi-Select Workers */}
          <label className={`${label} col-span-1 sm:col-span-2`}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faUsers} className="text-xs text-indigo-500" />
              </div>
              Assigned Workers ({assignedUserIds.length})
            </span>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[120px] overflow-y-auto p-2 border rounded-xl" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
              {workers.length === 0 ? (
                <div className="col-span-2 text-center text-sm text-gray-400 py-2">
                  No workers available
                </div>
              ) : (
                workers.map((w) => {
                  const isSelected = assignedUserIds.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWorkerSelection(w.id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                        isSelected 
                          ? "bg-indigo-100 text-indigo-700 border-indigo-300" 
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                      style={{ border: `1px solid ${isSelected ? "#6366F1" : "#E2E8F0"}` }}
                    >
                      <div 
                        className={`flex h-5 w-5 items-center justify-center rounded border transition-all duration-200 ${
                          isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <FontAwesomeIcon icon={faCheckCircle} className="text-white text-[8px]" />
                        )}
                      </div>
                      <span className="truncate">{w.name}</span>
                      {isSelected && (
                        <span className="ml-auto text-[8px] font-medium text-indigo-600">
                          {assignedUserIds.indexOf(w.id) === 0 ? "Lead" : "Team"}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "#94A3B8" }}>
              Click to select/deselect multiple workers • First selected is Lead
            </p>
          </label>

          <div className="col-span-1 sm:col-span-2">
            <ErrorText message={error} />
          </div>

          <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row items-center gap-3 sticky bottom-0 bg-white py-3 border-t border-gray-100">
            <button
              className="w-full sm:flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 transition-all duration-300 hover:bg-gray-200 active:scale-95"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="w-full sm:flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={saving || !workers.length}
              style={{ 
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                boxShadow: '0 4px 24px rgba(99, 102, 241, 0.3)'
              }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faRocket} />
                  Create Task
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSaved
}: {
  task: TaskDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assignedUserId, setAssignedUserId] = useState(task.assignedUserId);
  const [deadline, setDeadline] = useState(task.deadline.slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getWorkers().then(setWorkers);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.editTask(task.id, {
        title,
        description,
        priority,
        assignedUserId,
        deadline: new Date(deadline).toISOString()
      });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit task · ${task.referenceId}`} onClose={onClose} wide>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        <label className={`${label} col-span-2`}>
          Title
          <input className={`${input} mt-1.5`} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className={`${label} col-span-2`}>
          Description
          <textarea
            className={`${input} mt-1.5 min-h-[70px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className={label}>
          Priority
          <select className={`${input} mt-1.5`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Assigned worker
          <select
            className={`${input} mt-1.5`}
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
            required
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${label} col-span-2`}>
          Deadline
          <input
            className={`${input} mt-1.5`}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </label>
        <div className="col-span-2">
          <ErrorText message={error} />
        </div>
        <button className={`${btnDark} col-span-2`} type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}
