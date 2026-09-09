import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CommentDTO, TaskDTO, TaskStatus } from "@shared/types";
import { api, apiError } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../store/auth";
import { Badge, ErrorText, Spinner } from "../components/ui";
import { PRIORITY_BADGE, TASK_STATUS_BADGE, TASK_STATUS_LABEL } from "../lib/meta";
import { formatDate, formatDateTime, fileSize } from "../lib/format";

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDTO | null>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function load() {
    if (!id) return;
    api.getTask(id).then(setTask).catch((e) => setError(apiError(e)));
  }
  useEffect(load, [id]);

  // Live sync while the detail view is open.
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("subscribe:task", id);
    const onUpdated = () => load();
    const onComment = (c: CommentDTO) =>
      setTask((t) => (t ? { ...t, comments: [...(t.comments || []), c] } : t));
    socket.on("task:updated", onUpdated);
    socket.on("comment:new", onComment);
    return () => {
      socket.emit("unsubscribe:task", id);
      socket.off("task:updated", onUpdated);
      socket.off("comment:new", onComment);
    };
  }, [id]);

  if (error) return <ErrorText message={error} />;
  if (!task) return <Spinner />;

  const locked = task.status === "LOCKED";
  
  // Check if user can manage (ADMIN or MANAGER of the case)
  const canManage =
    user?.role === "ADMIN" || (user?.role === "MANAGER" && task.case?.assignedManagerId === user.id);
  
  // A worker may be attached as primary assignee or through assignments.
  const isAssignedToTask = 
    task.assignedUserId === user?.id || 
    (task.assignments && task.assignments.some((a: any) => a.userId === user?.id || a.user?.id === user?.id));

  // Worker can act if they're assigned to the task
  const isOwnerWorker = user?.role === "WORKER" && isAssignedToTask;

  // Check if user has permission to view this task
  const canView = 
    user?.role === "ADMIN" || 
    user?.role === "MANAGER" || 
    isAssignedToTask;

  // If user doesn't have permission to view, show error
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">You do not have permission to view this task</h2>
          <p className="text-gray-500">This task is not assigned to you.</p>
          <Link to="/cases" className="mt-4 inline-block text-indigo-600 hover:underline">
            Go back to cases
          </Link>
        </div>
      </div>
    );
  }

  async function act(fn: () => Promise<any>) {
    setBusy(true);
    try {
      await fn();
      load();
    } catch (e) {
      alert(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (s: TaskStatus) => act(() => api.updateTaskStatus(task!.id, s));
  
  const approve = () => act(() => api.approveTask(task!.id));
  const reject = () => {
    const c = window.prompt("Rejection reason (required):");
    if (c) act(() => api.rejectTask(task!.id, c));
  };

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !id) return;
    try {
      await api.addComment(id, comment.trim());
      setComment("");
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  async function upload(file: File) {
    if (!id) return;
    try {
      await api.uploadTaskFile(id, file);
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  const canUpload = !locked && (isOwnerWorker || canManage);

  // Assigned users come from the assignments relation.
  const assignedUsers = task.assignments?.map((a: any) => a.user) || [];

  return (
    <div className="max-w-3xl mx-auto p-4">
      {task.case && (
        <Link to={`/cases/${task.case.id}`} className="text-xs text-accent-info hover:underline">
          ← {task.case.title}
        </Link>
      )}
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-text-mute">{task.referenceId}</div>
          <h1 className="text-xl font-semibold">{task.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-accent-info/10 text-accent-info">{task.taskType?.replaceAll("_", " ")}</Badge>
          <Badge className={PRIORITY_BADGE[task.priority]}>{task.priority}</Badge>
          <Badge className={TASK_STATUS_BADGE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>
        </div>
      </div>
      <div className="mt-1 text-xs text-text-mute">Due {formatDate(task.deadline)}</div>
      
      {/* Every assigned user, not just the primary */}
      {assignedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-mute">Assigned to:</span>
          {assignedUsers.map((assignedUser: any) => (
            <Badge key={assignedUser.id} className="bg-indigo-50 text-indigo-700">
              {assignedUser.name}
              {assignedUser.id === task.assignedUserId && <span className="ml-1 text-[8px] font-bold">(Lead)</span>}
              {assignedUser.id === user?.id && <span className="ml-1 text-[8px] font-bold text-green-600">(You)</span>}
            </Badge>
          ))}
        </div>
      )}
      
      {locked && (
        <div className="mt-4 rounded border border-line bg-gray-100 px-4 py-3 text-sm text-text-mute">
          🔒 This task is locked until its dependency
          {task.dependsOn ? ` "${task.dependsOn.title}"` : ""} is completed. It is read-only until then.
        </div>
      )}

      <div className="card mt-4 p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-mute">Description</h2>
        <p className="whitespace-pre-wrap text-sm">{task.description}</p>
        {task.instructions && (
          <>
            <h2 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-text-mute">Instructions</h2>
            <p className="whitespace-pre-wrap text-sm">{task.instructions}</p>
          </>
        )}
      </div>

      {/* Actions */}
      {!locked && (isOwnerWorker || canManage) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isOwnerWorker && task.status === "PENDING" && (
            <button className="btn-dark" disabled={busy} onClick={() => setStatus("IN_PROGRESS" as TaskStatus)}>
              Start task
            </button>
          )}
          {isOwnerWorker && task.status === "IN_PROGRESS" && (
            <button className="btn-dark" disabled={busy} onClick={() => setStatus("SUBMITTED" as TaskStatus)}>
              Submit for review
            </button>
          )}
          {canManage && task.status === "SUBMITTED" && (
            <button className="btn" disabled={busy} onClick={() => setStatus("UNDER_REVIEW" as TaskStatus)}>
              Begin review
            </button>
          )}
          {canManage && (task.status === "SUBMITTED" || task.status === "UNDER_REVIEW") && (
            <>
              <button className="btn-dark" disabled={busy} onClick={approve}>
                Approve
              </button>
              <button
                className="btn border-accent-reject text-accent-reject"
                disabled={busy}
                onClick={reject}
              >
                Reject
              </button>
            </>
          )}
          {canUpload && (
            <>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              <button className="btn" onClick={() => fileInput.current?.click()}>
                Attach file
              </button>
            </>
          )}
        </div>
      )}

      {/* Files */}
      <div className="card mt-5 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-mute">Files</h2>
        {!task.files || task.files.length === 0 ? (
          <p className="text-sm text-text-mute">No files uploaded.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {task.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <span>{f.filename}</span>
                <button className="text-accent-info hover:underline" onClick={() => api.downloadFile(f.id, f.filename)}>
                  Download ({fileSize(f.size)})
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Comments */}
      <div className="card mt-5 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-mute">Comments</h2>
        <div className="space-y-3">
          {(task.comments || []).length === 0 && <p className="text-sm text-text-mute">No comments yet.</p>}
          {(task.comments || []).map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{c.author?.name ?? "User"}</span>{" "}
              <span className="text-xs text-text-mute">
                {c.author?.role} · {formatDateTime(c.createdAt)}
              </span>
              <div className="whitespace-pre-wrap">{c.message}</div>
            </div>
          ))}
        </div>
        {!locked && (
          <form onSubmit={submitComment} className="mt-3 flex gap-2">
            <input
              className="input flex-1"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
            />
            <button className="btn-dark" type="submit">
              Post
            </button>
          </form>
        )}
      </div>

      {/* History */}
      <div className="card mt-5 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-mute">History</h2>
        {!task.history || task.history.length === 0 ? (
          <p className="text-sm text-text-mute">No history yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {task.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between">
                <span>
                  <span className="font-medium">{h.action.replaceAll("_", " ")}</span>
                  {h.details && <span className="text-text-mute"> - {h.details}</span>}
                  {h.actor && <span className="text-text-mute"> · {h.actor}</span>}
                </span>
                <span className="whitespace-nowrap text-xs text-text-mute">{formatDateTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}