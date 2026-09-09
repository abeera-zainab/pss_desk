import { useEffect, useRef, useState } from "react";
import type { TaskDTO, TaskStatus } from "@shared/types";
import { api, apiError } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../store/auth";
import TaskCard from "../components/TaskCard";
import { Spinner } from "../components/ui";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, faClock, faSpinner, faPaperPlane, faSearch, 
  faCheckCircle, faTimesCircle, faChartBar,
  faTasks, faFire, faRocket
} from '@fortawesome/free-solid-svg-icons';

const ink = "#1A1D23";
const mute = "#64748B";
const border = "#E2E8F0";
const pageBg = "#F8FAFC";

const COLUMN_META: Record<TaskStatus, { 
  label: string; 
  bg: string; 
  dot: string; 
  text: string;
  icon: any;
}> = {
  LOCKED: { 
    label: "Locked", 
    bg: "#F1F5F9", 
    dot: "#94A3B8", 
    text: "#64748B", 
    icon: faLock
  },
  PENDING: { 
    label: "Pending", 
    bg: "#F1F5F9", 
    dot: "#94A3B8", 
    text: "#64748B", 
    icon: faClock
  },
  IN_PROGRESS: { 
    label: "In Progress", 
    bg: "#FEF3C7", 
    dot: "#F59E0B", 
    text: "#D97706", 
    icon: faSpinner
  },
  SUBMITTED: { 
    label: "Submitted", 
    bg: "#DBEAFE", 
    dot: "#3B82F6", 
    text: "#2563EB", 
    icon: faPaperPlane
  },
  UNDER_REVIEW: { 
    label: "Under Review", 
    bg: "#E0E7FF", 
    dot: "#6366F1", 
    text: "#4F46E5", 
    icon: faSearch
  },
  COMPLETED: { 
    label: "Completed", 
    bg: "#D1FAE5", 
    dot: "#10B981", 
    text: "#059669", 
    icon: faCheckCircle
  },
  REJECTED: { 
    label: "Rejected", 
    bg: "#FEE2E2", 
    dot: "#EF4444", 
    text: "#DC2626", 
    icon: faTimesCircle
  }
};

const COLUMN_ORDER: TaskStatus[] = [
  "LOCKED",
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "COMPLETED",
  "REJECTED"
];

function Keyframes() {
  return (
    <style>{`
      @keyframes kbFadeUp { 
        from { opacity: 0; transform: translateY(20px); } 
        to { opacity: 1; transform: translateY(0); } 
      }
      @keyframes kbFadeIn { 
        from { opacity: 0; } 
        to { opacity: 1; } 
      }
      @keyframes kbPop { 
        0% { transform: scale(0.9); opacity: 0; } 
        70% { transform: scale(1.02); opacity: 1; }
        100% { transform: scale(1); opacity: 1; } 
      }
      @keyframes kbShimmer { 
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes kbCountUp { 
        from { opacity: 0; transform: scale(0.5); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
  );
}

export default function KanbanBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const subscribed = useRef<Set<string>>(new Set());

  function upsert(task: TaskDTO) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx === -1) return [...prev, task];
      const next = [...prev];
      next[idx] = { ...next[idx], ...task };
      return next;
    });
  }

  useEffect(() => {
    const socket = getSocket();

    api
      .getTasks({ limit: 200 })
      .then((res) => {
        setTasks(res.data);
        if (socket) {
          const caseIds = new Set(res.data.map((t) => t.caseId));
          caseIds.forEach((id) => {
            socket.emit("subscribe:case", id);
            subscribed.current.add(id);
          });
        }
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));

    if (!socket) return;
    const onCreated = (t: TaskDTO) => upsert(t);
    const onUpdated = (t: TaskDTO) => upsert(t);
    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);

    return () => {
      socket.off("task:created", onCreated);
      socket.off("task:updated", onUpdated);
      subscribed.current.forEach((id) => socket.emit("unsubscribe:case", id));
      subscribed.current.clear();
    };
  }, []);

  function canDrag(task: TaskDTO): boolean {
    if (task.status === "LOCKED") return false;
    if (user?.role === "WORKER") return task.assignedUserId === user.id;
    return true;
  }

  async function handleDrop(to: TaskStatus, taskId: string) {
    setDragOverCol(null);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === to) return;
    try {
      let updated: TaskDTO;
      if (to === "COMPLETED") {
        updated = await api.approveTask(taskId);
      } else if (to === "REJECTED") {
        const comment = window.prompt("Rejection reason (required):");
        if (!comment) return;
        updated = await api.rejectTask(taskId, comment);
      } else {
        updated = await api.updateTaskStatus(taskId, to);
      }
      upsert(updated);
    } catch (e) {
      alert(apiError(e));
    }
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading)
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div 
            className="h-14 w-14 animate-spin rounded-full border-4"
            style={{ 
              borderColor: '#E2E8F0',
              borderTopColor: '#6366F1',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)'
            }}
          />
          <p className="text-sm font-medium" style={{ color: mute }}>Loading your board...</p>
        </div>
      </div>
    );
  if (error) return <div style={{ color: "#E0607A" }}>{error}</div>;

  return (
    <div className="min-h-full p-6 lg:p-8" style={{ background: pageBg }}>
      <Keyframes />

      {/* Header */}
      <div className="mb-8" style={{ animation: "kbFadeUp 0.5s ease-out both" }}>
        <div className="flex items-center gap-3">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
            }}
          >
            <FontAwesomeIcon icon={faRocket} className="text-xl text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: ink }}>
              Case &amp; Task Board
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: mute }}>
              <FontAwesomeIcon icon={faFire} className="mr-1.5 text-orange-400" />
              {totalTasks} tasks · {progress}% complete
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: mute }}>Overall Progress</span>
            <span className="text-xs font-bold" style={{ color: '#6366F1' }}>{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: border }}>
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
                backgroundSize: '200% 100%',
                animation: 'kbShimmer 2s linear infinite'
              }}
            />
          </div>
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex gap-5 overflow-x-auto pb-6" style={{ scrollbarWidth: 'thin' }}>
        {COLUMN_ORDER.map((key, colIndex) => {
          const meta = COLUMN_META[key];
          const colTasks = tasks.filter((t) => t.status === key);
          const isOver = dragOverCol === key;

          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverCol !== key) setDragOverCol(key);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === key ? null : c))}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/plain");
                if (id) handleDrop(key, id);
              }}
              className="w-72 lg:w-80 flex-shrink-0 rounded-3xl border p-4 transition-all duration-300 hover:shadow-lg"
              style={{
                background: isOver ? '#F0FDF9' : 'white',
                borderColor: isOver ? '#10B981' : border,
                animation: `kbFadeUp 0.5s ease-out ${colIndex * 80}ms both`,
                boxShadow: isOver ? '0 0 0 4px rgba(16,185,129,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                transform: isOver ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 hover:scale-110"
                    style={{ background: meta.bg }}
                  >
                    <FontAwesomeIcon 
                      icon={meta.icon} 
                      className="text-sm"
                      style={{ color: meta.text }}
                    />
                  </div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: meta.text }}
                  >
                    {meta.label}
                  </span>
                </div>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs transition-all duration-300 hover:scale-110"
                  style={{ 
                    background: meta.bg, 
                    color: meta.text,
                    animation: 'kbCountUp 0.4s ease-out'
                  }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="min-h-[300px] space-y-3">
                {colTasks.length === 0 && (
                  <div
                    className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed text-sm transition-all duration-300 hover:border-indigo-300"
                    style={{ borderColor: border, color: mute }}
                  >
                    <div className="text-center">
                      <FontAwesomeIcon icon={meta.icon} className="text-3xl mb-2 opacity-20" />
                      <p>No tasks</p>
                    </div>
                  </div>
                )}
                {colTasks.map((task, i) => (
                  <div 
                    key={task.id} 
                    style={{ animation: `kbPop 0.4s ease-out ${i * 60}ms both` }}
                    className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <TaskCard
                      task={task}
                      draggable={canDrag(task)}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Stats - Simple */}
      <div 
        className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl bg-white px-6 py-4 border shadow-sm"
        style={{ borderColor: border, animation: 'kbFadeUp 0.5s ease-out 0.5s both' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
            <FontAwesomeIcon icon={faTasks} className="text-indigo-500" />
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Tasks</span>
            <p className="text-lg font-bold" style={{ color: ink }}>{totalTasks}</p>
          </div>
        </div>
        <div className="w-px h-10" style={{ background: border }} />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Completion</span>
            <p className="text-lg font-bold" style={{ color: '#10B981' }}>{progress}%</p>
          </div>
        </div>
        <div className="w-px h-10" style={{ background: border }} />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50">
            <FontAwesomeIcon icon={faSpinner} className="text-amber-500" />
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">In Progress</span>
            <p className="text-lg font-bold" style={{ color: '#F59E0B' }}>
              {tasks.filter(t => t.status === 'IN_PROGRESS').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}