import { Link } from "react-router-dom";
import type { TaskDTO, Priority } from "@shared/types";

const ink = "#1A1D23";
const mute = "#8B92A0";
const border = "#EDEFF2";

const PRIORITY_STYLE: Record<Priority, { bg: string; text: string }> = {
  LOW: { bg: "#F1F2F4", text: "#6B7280" },
  MEDIUM: { bg: "#EAF5FE", text: "#3B9FDB" },
  HIGH: { bg: "#FEF6E7", text: "#D6980A" },
  URGENT: { bg: "#FDEEF0", text: "#E0607A" }
};

export default function TaskCard({
  task,
  draggable,
  onDragStart
}: {
  task: TaskDTO;
  draggable: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const p = PRIORITY_STYLE[task.priority];

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`group rounded-xl border bg-white p-3 shadow-[0_1px_2px_rgba(26,29,35,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(26,29,35,0.18)] ${
        draggable ? "cursor-grab active:scale-[0.97] active:cursor-grabbing" : "opacity-70"
      }`}
      style={{ borderColor: border }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] font-medium" style={{ color: mute }}>
            {task.referenceId}
          </div>
          <Link
            to={`/tasks/${task.id}`}
            className="line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-[#0FA98A]"
            style={{ color: ink }}
          >
            {task.title}
          </Link>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
          style={{ background: p.bg, color: p.text }}
        >
          {task.priority}
        </span>
      </div>

      {task.case && (
        <div className="mt-1.5 truncate font-mono text-[10.5px]" style={{ color: mute }}>
          {task.case.title}
        </div>
      )}

      {task.assignedUser && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#0FA98A" }}>
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ background: "#0FA98A" }}
          >
            {task.assignedUser.name.charAt(0).toUpperCase()}
          </span>
          {task.assignedUser.name}
        </div>
      )}
    </div>
  );
}