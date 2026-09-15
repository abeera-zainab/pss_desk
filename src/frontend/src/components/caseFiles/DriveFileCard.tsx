import { useRef, useState } from "react";
import type { FileDTO } from "@shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
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
      <button type="button" className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100" onClick={onOpen} title={file.filename}>
        <DocumentThumbnail file={file} />
        <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          {fileExt(file.filename) || "file"}
        </span>
      </button>
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
        {canDelete && onDelete && (
          <button
            type="button"
            className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            title="Delete"
            onClick={() => onDelete(file.id, file.filename)}
          >
            <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
          </button>
        )}
      </div>
    </div>
  );
}
