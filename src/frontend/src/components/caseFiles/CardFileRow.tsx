import type { FileDTO } from "@shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faTrash } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../lib/api";
import { formatDate, fileSize } from "../../lib/format";
import { getFileIcon } from "./fileKinds";

export function CardFileRow({
  file,
  canDelete,
  onDelete,
  onOpen
}: {
  file: FileDTO;
  canDelete?: boolean;
  onDelete?: (fileId: string, filename: string) => void;
  onOpen?: (file: FileDTO) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-white"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen?.(file);
        }}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: "#EEF2FF" }}>
          <FontAwesomeIcon icon={getFileIcon(file.filename)} className="text-[9px] text-indigo-500" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-medium" style={{ color: "#1A1D23" }} title={file.filename}>
            {file.filename}
          </span>
          <span className="block text-[9px]" style={{ color: "#94A3B8" }}>
            {fileSize(file.size)} · {formatDate(file.createdAt)}
            {file.uploader?.name ? ` · ${file.uploader.name}` : ""}
          </span>
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-0.5">
        <button
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-indigo-50 hover:text-indigo-600"
          title="Download"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            api.downloadFile(file.id, file.filename);
          }}
        >
          <FontAwesomeIcon icon={faDownload} className="text-[9px]" />
        </button>
        {canDelete && onDelete && (
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
            title="Delete"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(file.id, file.filename);
            }}
          >
            <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
          </button>
        )}
      </span>
    </div>
  );
}
