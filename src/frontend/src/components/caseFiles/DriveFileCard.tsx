import type { FileDTO } from "@shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faFileAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { formatDate, fileSize } from "../../lib/format";
import { fileExt } from "./fileKinds";
import { DocumentThumbnail } from "./DocumentThumbnail";

export function DriveFileCard({
  file,
  canDelete,
  onOpen,
  onDelete
}: {
  file: FileDTO;
  canDelete?: boolean;
  onOpen: () => void;
  onDelete?: (fileId: string, filename: string) => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <button type="button" className="h-full w-full" onClick={onOpen} title={`Open preview: ${file.filename}`}>
          <DocumentThumbnail file={file} />
        </button>
        <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          {fileExt(file.filename) || "file"}
        </span>
        {canDelete && onDelete && (
          <button
            type="button"
            className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm hover:bg-red-700"
            title="Delete report"
            aria-label="Delete report"
            onClick={() => onDelete(file.id, file.filename)}
          >
            <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
          </button>
        )}
        <button
          type="button"
          className="absolute bottom-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-indigo-600 shadow-sm"
          title="Preview"
          onClick={onOpen}
        >
          <FontAwesomeIcon icon={faExpand} className="text-[11px]" />
        </button>
      </div>
      <div className="flex items-start gap-2 px-2.5 py-2">
        <FontAwesomeIcon icon={faFileAlt} className="mt-0.5 text-[11px] text-slate-400" />
        <div className="min-w-0 flex-1">
          <button type="button" className="block w-full truncate text-left text-xs font-semibold text-slate-800" title={file.filename} onClick={onOpen}>
            {file.filename}
          </button>
          <p className="text-[10px] text-slate-400">
            {fileSize(file.size)} · {formatDate(file.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
