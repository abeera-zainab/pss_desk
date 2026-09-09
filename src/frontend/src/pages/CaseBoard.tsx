import { useEffect, useRef, useState } from "react";
import type { BoardItemDTO, BoardConnectionDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../store/auth";
import { Spinner } from "../components/ui";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLink, 
  faDownload, 
  faTrash, 
  faEdit, 
  faFile, 
  faImage, 
  faVideo, 
  faFileAlt,
  faArrowsAlt,
  faSave,
  faTimes,
  faRocket,
  faArrowRight,
  faHandPointer,
  faPlus,
  faUpload,
  faPaperclip,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFileArchive,
  faFileCode,
  faEye,
  faLock
} from '@fortawesome/free-solid-svg-icons';

function isImage(mimetype: string) {
  return mimetype.startsWith("image/");
}
function isVideo(mimetype: string) {
  return mimetype.startsWith("video/");
}

// Get file icon based on mime type
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return faFilePdf;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return faImage;
  if (['doc', 'docx'].includes(ext || '')) return faFileWord;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return faFileExcel;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return faFileArchive;
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml'].includes(ext || '')) return faFileCode;
  return faFileAlt;
};

const CARD_W = 200;
const CARD_H = 170;

function BoardKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes popIn {
        0% { transform: scale(0.8) rotate(-2deg); opacity: 0; }
        60% { transform: scale(1.05) rotate(1deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.1); }
      }
    `}</style>
  );
}

export default function CaseBoard({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<BoardItemDTO[]>([]);
  const [connections, setConnections] = useState<BoardConnectionDTO[]>([]);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState("");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  function load() {
    setLoading(true);
    Promise.all([api.getBoard(caseId), api.getConnections(caseId)])
      .then(([i, c]) => {
        setItems(i);
        setConnections(c);
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, [caseId]);

  useEffect(() => {
    items.forEach((item) => {
      const f = item.file;
      if ((isImage(f.mimetype) || isVideo(f.mimetype)) && !blobUrls[f.id]) {
        api
          .getFileBlobUrl(f.id)
          .then((url) => setBlobUrls((prev) => ({ ...prev, [f.id]: url })))
          .catch(() => {});
      }
    });
  }, [items]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("subscribe:case", caseId);

    const onAdded = (item: BoardItemDTO) => setItems((prev) => [...prev, item]);
    const onMoved = (item: BoardItemDTO) =>
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    const onUpdated = (item: BoardItemDTO) =>
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    const onDeleted = ({ id }: { id: string }) =>
      setItems((prev) => prev.filter((i) => i.id !== id));
    const onConnAdded = (c: BoardConnectionDTO) => setConnections((prev) => [...prev, c]);
    const onConnDeleted = ({ id }: { id: string }) =>
      setConnections((prev) => prev.filter((c) => c.id !== id));

    socket.on("board:item-added", onAdded);
    socket.on("board:item-moved", onMoved);
    socket.on("board:item-updated", onUpdated);
    socket.on("board:item-deleted", onDeleted);
    socket.on("board:connection-added", onConnAdded);
    socket.on("board:connection-deleted", onConnDeleted);

    return () => {
      socket.off("board:item-added", onAdded);
      socket.off("board:item-moved", onMoved);
      socket.off("board:item-updated", onUpdated);
      socket.off("board:item-deleted", onDeleted);
      socket.off("board:connection-added", onConnAdded);
      socket.off("board:connection-deleted", onConnDeleted);
      socket.emit("unsubscribe:case", caseId);
    };
  }, [caseId]);

  function onCardPointerDown(e: React.PointerEvent, item: BoardItemDTO) {
    if (connectMode) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: item.id, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y };
  }

  function onCardPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || dragRef.current.id !== (e.currentTarget as HTMLElement).dataset.itemId) return;
    const d = dragRef.current;
    const newX = d.origX + (e.clientX - d.startX);
    const newY = d.origY + (e.clientY - d.startY);
    setItems((prev) => prev.map((i) => (i.id === d.id ? { ...i, x: newX, y: newY } : i)));
  }

  async function onCardPointerUp(e: React.PointerEvent, item: BoardItemDTO) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    dragRef.current = null;
    const moved = items.find((i) => i.id === d.id);
    if (moved && (moved.x !== d.origX || moved.y !== d.origY)) {
      try {
        await api.moveBoardItem(caseId, d.id, moved.x, moved.y);
      } catch (err) {
        alert(apiError(err));
      }
    }
  }

  function onCardClick(item: BoardItemDTO) {
    if (!connectMode) return;
    if (!connectFrom) {
      setConnectFrom(item.id);
      return;
    }
    if (connectFrom === item.id) {
      setConnectFrom(null);
      return;
    }
    api
      .addConnection(caseId, connectFrom, item.id)
      .then((conn) => setConnections((prev) => [...prev, conn]))
      .catch((e) => alert(apiError(e)));
    setConnectFrom(null);
  }

  async function removeConnection(id: string) {
    if (!window.confirm("Remove this connection?")) return;
    try {
      await api.deleteConnection(caseId, id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(apiError(e));
    }
  }

  async function removeItem(id: string) {
    if (!window.confirm("Remove this item from the board?")) return;
    try {
      await api.deleteBoardItem(caseId, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      alert(apiError(e));
    }
  }

  function startEditingDescription(item: BoardItemDTO) {
    setEditingDescId(item.id);
    setDescDraft(item.description ?? "");
  }

  async function saveDescription(id: string) {
    try {
      const updated = await api.updateBoardItemDescription(caseId, id, descDraft);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      alert(apiError(e));
    } finally {
      setEditingDescId(null);
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const files = Array.from(e.dataTransfer.files);
    for (let i = 0; i < files.length; i++) {
      const x = e.clientX - rect.left + i * 30;
      const y = e.clientY - rect.top + i * 30;
      try {
        const item = await api.addBoardItem(caseId, files[i], x, y);
        setItems((prev) => [...prev, item]);
      } catch (err) {
        alert(apiError(err));
      }
    }
  }

  if (loading) return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div 
          className="h-14 w-14 animate-spin rounded-full border-4"
          style={{ 
            borderColor: '#E2E8F0',
            borderTopColor: '#6366F1',
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)'
          }}
        />
        <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading board...</p>
      </div>
    </div>
  );
  if (error) return <div className="text-red-500">{error}</div>;

  function center(item: BoardItemDTO) {
    return { cx: item.x + CARD_W / 2, cy: item.y + CARD_H / 2 };
  }

  return (
    <div className="space-y-4">
      <BoardKeyframes />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#EEF2FF' }}>
            <FontAwesomeIcon icon={faRocket} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#1A1D23" }}>Board</h2>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              <FontAwesomeIcon icon={faFile} className="mr-1" />
              {items.length} items · {connections.length} connections
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
            <FontAwesomeIcon icon={faHandPointer} className="text-indigo-400" />
            <span>Drag files to add</span>
          </div>
          <button
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
              connectMode 
                ? "text-white shadow-lg" 
                : "border hover:bg-slate-50"
            }`}
            style={{
              background: connectMode ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              borderColor: connectMode ? 'transparent' : '#E2E8F0',
              color: connectMode ? 'white' : '#64748B',
              boxShadow: connectMode ? '0 4px 20px rgba(99, 102, 241, 0.3)' : 'none'
            }}
            onClick={() => {
              setConnectMode((m) => !m);
              setConnectFrom(null);
            }}
          >
            <FontAwesomeIcon icon={faLink} />
            {connectMode ? "Connecting..." : "Connect Items"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="relative h-[70vh] w-full overflow-auto rounded-2xl border-2 border-dashed transition-all duration-300 hover:border-indigo-300"
        style={{ 
          background: "#FAFBFC",
          borderColor: "#E2E8F0",
          backgroundImage: "radial-gradient(#E2E8F0 1px, transparent 1px)", 
          backgroundSize: "24px 24px" 
        }}
      >
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: '#EEF2FF' }}>
              <FontAwesomeIcon icon={faHandPointer} className="text-4xl" style={{ color: '#6366F1' }} />
            </div>
            <p className="mt-4 text-sm font-medium" style={{ color: "#1A1D23" }}>No items yet</p>
            <p className="text-sm" style={{ color: "#94A3B8" }}>Drag a file here to get started</p>
          </div>
        )}

        {/* SVG Connections */}
        <svg className="pointer-events-none absolute left-0 top-0 h-full w-full" style={{ minWidth: "100%", minHeight: "100%" }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <polygon points="0 0, 10 5, 0 10" fill="#6366F1" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {connections.map((conn) => {
            const from = items.find((i) => i.id === conn.fromItemId);
            const to = items.find((i) => i.id === conn.toItemId);
            if (!from || !to) return null;
            const a = center(from);
            const b = center(to);
            return (
              <g key={conn.id}>
                <line 
                  x1={a.cx} 
                  y1={a.cy} 
                  x2={b.cx} 
                  y2={b.cy} 
                  stroke="#6366F1" 
                  strokeWidth={2.5} 
                  markerEnd="url(#arrowhead)" 
                  filter="url(#glow)"
                />
                <line
                  x1={a.cx}
                  y1={a.cy}
                  x2={b.cx}
                  y2={b.cy}
                  stroke="transparent"
                  strokeWidth={20}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => removeConnection(conn.id)}
                />
              </g>
            );
          })}
        </svg>

        {/* Cards */}
        {items.map((item) => {
          const f = item.file;
          const selected = connectFrom === item.id;
          const isEditing = editingDescId === item.id;
          const isHovered = hoveredCard === item.id;
          const fileIcon = getFileIcon(f.filename);
          
          return (
            <div
              key={item.id}
              data-item-id={item.id}
              className={`board-card absolute rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
                connectMode ? "cursor-pointer hover:shadow-lg" : "cursor-grab active:cursor-grabbing"
              } ${selected ? "border-indigo-500 ring-4 ring-indigo-200" : "border-gray-200"} ${
                isHovered ? "shadow-lg -translate-y-0.5" : ""
              }`}
              style={{ 
                left: item.x, 
                top: item.y, 
                touchAction: "none",
                width: CARD_W,
                height: CARD_H,
                animation: `popIn 0.4s ease-out`
              }}
              onPointerDown={(e) => onCardPointerDown(e, item)}
              onPointerMove={onCardPointerMove}
              onPointerUp={(e) => onCardPointerUp(e, item)}
              onClick={() => onCardClick(item)}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Media Preview */}
              <div className="relative h-28 w-full overflow-hidden rounded-t-xl bg-gray-50">
                {isImage(f.mimetype) ? (
                  blobUrls[f.id] ? (
                    <img 
                      src={blobUrls[f.id]} 
                      alt={f.filename} 
                      className="h-full w-full object-cover" 
                      draggable={false} 
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                      <div className="flex flex-col items-center gap-1">
                        <FontAwesomeIcon icon={faImage} className="text-2xl" />
                        <span>Loading...</span>
                      </div>
                    </div>
                  )
                ) : isVideo(f.mimetype) ? (
                  blobUrls[f.id] ? (
                    <video 
                      src={blobUrls[f.id]} 
                      className="h-full w-full object-cover" 
                      muted 
                      draggable={false} 
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                      <div className="flex flex-col items-center gap-1">
                        <FontAwesomeIcon icon={faVideo} className="text-2xl" />
                        <span>Loading...</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
                    <FontAwesomeIcon icon={fileIcon} />
                  </div>
                )}
                
                {/* File type badge */}
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-0.5 text-[8px] font-medium text-white backdrop-blur-sm">
                  {f.mimetype.split('/')[1]?.toUpperCase() || 'FILE'}
                </div>
              </div>

              {/* Content */}
              <div className="p-2.5">
                <div className="truncate text-xs font-medium" style={{ color: "#1A1D23" }}>
                  {f.filename}
                </div>

                {isEditing ? (
                  <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <textarea
                      autoFocus
                      className="mt-1 w-full resize-none rounded-lg border border-gray-200 p-1.5 text-[10px] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      rows={2}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      onBlur={() => saveDescription(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingDescId(null);
                        if (e.key === 'Enter' && e.ctrlKey) saveDescription(item.id);
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="mt-0.5 flex cursor-pointer items-start gap-1 text-[9px] text-gray-400 hover:text-gray-600"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingDescription(item);
                    }}
                    title="Click to edit description"
                  >
                    <FontAwesomeIcon icon={faEdit} className="mt-0.5 text-[8px] opacity-50" />
                    <span className="line-clamp-1">
                      {item.description || "Add a description..."}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-1.5 flex items-center justify-between border-t border-gray-100 pt-1.5">
                  <button
                    className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-medium text-indigo-500 transition-all duration-200 hover:bg-indigo-50"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (blobUrls[f.id]) {
                        window.open(blobUrls[f.id], "_blank");
                      } else {
                        api.downloadFile(f.id, f.filename);
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faEye} className="text-[8px]" />
                    Open
                  </button>
                  <button
                    className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-medium text-red-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-[8px]" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}