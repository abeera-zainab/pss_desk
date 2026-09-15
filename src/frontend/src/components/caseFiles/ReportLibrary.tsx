import { useRef, useState } from "react";
import type { CaseDTO, CaseFileFolder, FileDTO } from "@shared/types";
import { CaseFilePreview } from "./CaseFilePreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFolder,
  faFolderOpen,
  faSearch,
  faSpinner,
  faUpload
} from "@fortawesome/free-solid-svg-icons";
import { api, apiError } from "../../lib/api";
import { fileSize } from "../../lib/format";
import { extractFilesFromDropEvent } from "./dropFiles";
import { CASE_FILE_FOLDERS, type CaseFolderMeta } from "./folders";
import { DocumentThumbnail } from "./DocumentThumbnail";
import { DriveFileCard } from "./DriveFileCard";

function FolderTile({
  folder,
  files,
  onOpen
}: {
  folder: CaseFolderMeta;
  files: FileDTO[];
  onOpen: () => void;
}) {
  const mosaic = files.slice(0, 4);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
    >
      <div className="aspect-[4/3] bg-slate-50 p-2">
        {mosaic.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
            <FontAwesomeIcon icon={faFolder} className="text-4xl" style={{ color: folder.color }} />
          </div>
        ) : mosaic.length === 1 ? (
          <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
            <DocumentThumbnail file={mosaic[0]} />
          </div>
        ) : (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {mosaic[i] ? <DocumentThumbnail file={mosaic[i]} /> : <div className="h-full bg-slate-100" />}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-3 py-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
          style={{ background: `${folder.color}18`, color: folder.color }}
        >
          <FontAwesomeIcon icon={folder.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">{folder.label}</span>
          <span className="block truncate text-[11px] text-slate-400">
            {files.length === 0 ? "Empty folder" : `${files.length} report${files.length === 1 ? "" : "s"}`}
          </span>
        </span>
      </div>
    </button>
  );
}

function FolderView({
  kase,
  folder,
  canUpload,
  onChanged,
  onBack
}: {
  kase: CaseDTO;
  folder: CaseFolderMeta;
  canUpload: boolean;
  onChanged: () => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const dirInput = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<FileDTO | null>(null);

  const allFiles = (kase.files ?? []).filter((f) => f.folder === folder.value);
  const query = search.toLowerCase().trim();
  const files = query ? allFiles.filter((f) => f.filename.toLowerCase().includes(query)) : allFiles;
  const isBusy = uploadingName !== null;
  const totalBytes = allFiles.reduce((acc, f) => acc + f.size, 0);

  async function upload(list: FileList | File[]) {
    const arr = Array.from(list).filter((f) => f && f.size > 0);
    if (arr.length === 0) return;
    try {
      for (const f of arr) {
        setUploadingName(f.name);
        await api.uploadCaseFile(kase.id, f, folder.value);
      }
      onChanged();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setUploadingName(null);
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!window.confirm(`Delete "${filename}" from ${folder.label}?`)) return;
    try {
      await api.deleteCaseFile(kase.id, fileId);
      onChanged();
    } catch (err) {
      alert(apiError(err));
    }
  }

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm ${dragOver ? "border-dashed border-indigo-400 ring-2 ring-indigo-100" : ""}`}
      style={{ borderColor: "#E2E8F0" }}
      onDragOver={(e) => {
        e.preventDefault();
        if (canUpload && !dragOver) setDragOver(true);
      }}
      onDragLeave={() => dragOver && setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOver(false);
        if (!canUpload) return;
        const dropped = await extractFilesFromDropEvent(e);
        if (dropped.length) upload(dropped);
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
            All reports
          </button>
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px]"
                style={{ background: `${folder.color}18`, color: folder.color }}
              >
                <FontAwesomeIcon icon={folder.icon} />
              </span>
              {folder.label}
            </h3>
            <p className="text-[11px] text-slate-400">
              {folder.hint}
              {allFiles.length > 0 ? ` · ${allFiles.length} files · ${fileSize(totalBytes)}` : ""}
            </p>
          </div>
        </div>
        {canUpload && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={(el) => {
                if (el) {
                  el.setAttribute("webkitdirectory", "");
                  el.setAttribute("directory", "");
                }
                dirInput.current = el;
              }}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={isBusy}
              onClick={() => fileInput.current?.click()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <FontAwesomeIcon icon={faUpload} className="mr-1 text-[10px]" />
              Files
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => dirInput.current?.click()}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${folder.color}, ${folder.color}cc)` }}
            >
              <FontAwesomeIcon icon={faFolder} className="mr-1 text-[10px]" />
              Folder
            </button>
          </div>
        )}
      </div>

      {isBusy && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          Uploading {uploadingName}...
        </div>
      )}

      {allFiles.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${allFiles.length} reports...`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      )}

      {allFiles.length === 0 ? (
        <button
          type="button"
          className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center hover:border-indigo-300"
          onClick={() => canUpload && fileInput.current?.click()}
        >
          <FontAwesomeIcon icon={folder.icon} className="text-3xl text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">
            {canUpload ? `No ${folder.label} reports yet — click to upload` : `No ${folder.label} reports in this case`}
          </p>
        </button>
      ) : files.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No files match "{search}"</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {files.map((f) => (
            <DriveFileCard
              key={f.id}
              file={f}
              canDelete={canUpload}
              onOpen={() => setPreview(f)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      {preview && <CaseFilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

export function ReportLibrary({
  kase,
  canUpload,
  onChanged
}: {
  kase: CaseDTO;
  canUpload: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState<CaseFileFolder | null>(null);
  const openFolder = open ? CASE_FILE_FOLDERS.find((f) => f.value === open) : null;

  if (openFolder) {
    return (
      <FolderView kase={kase} folder={openFolder} canUpload={canUpload} onChanged={onChanged} onBack={() => setOpen(null)} />
    );
  }

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm" style={{ borderColor: "#E2E8F0" }}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
          <FontAwesomeIcon icon={faFolderOpen} className="text-indigo-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "#1A1D23" }}>
            Reports
          </h2>
          <p className="text-[11px] text-slate-400">Open a folder to preview uploaded reports</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CASE_FILE_FOLDERS.map((folder) => (
          <FolderTile
            key={folder.value}
            folder={folder}
            files={(kase.files ?? []).filter((f) => f.folder === folder.value)}
            onOpen={() => setOpen(folder.value)}
          />
        ))}
      </div>
    </div>
  );
}
