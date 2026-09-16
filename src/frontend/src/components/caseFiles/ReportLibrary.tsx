import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { CaseDTO, CaseFileFolder, FileDTO } from "@shared/types";
import { CaseFilePreview } from "./CaseFilePreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
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
import { DriveFileCard } from "./DriveFileCard";

function FolderReports({
  kase,
  folder,
  canUpload,
  onChanged
}: {
  kase: CaseDTO;
  folder: CaseFolderMeta;
  canUpload: boolean;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const dirInput = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<FileDTO | null>(null);

  const allFiles = (kase.files ?? []).filter((f) => f.folder === folder.value);
  const query = search.toLowerCase().trim();
  const files = query ? allFiles.filter((f) => f.filename.toLowerCase().includes(query)) : allFiles;
  const isBusy = uploadingName !== null;
  const totalBytes = allFiles.reduce((acc, f) => acc + f.size, 0);

  useEffect(() => {
    setSearch("");
    setPreview(null);
    setPreviewOpen(false);
  }, [folder.value]);

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
      className={`p-5 ${dragOver ? "bg-indigo-50/40" : ""}`}
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
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{folder.label}</h3>
          <p className="text-[11px] text-slate-400">
            {folder.hint}
            {allFiles.length > 0 ? ` · ${allFiles.length} files · ${fileSize(totalBytes)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allFiles.length > 0 && (
            <button
              type="button"
              title={previewOpen ? "Close reports preview" : "Open reports preview"}
              aria-expanded={previewOpen}
              onClick={() => setPreviewOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: previewOpen ? folder.color : "#E2E8F0",
                background: previewOpen ? `${folder.color}12` : "white",
                color: previewOpen ? folder.color : "#64748B"
              }}
            >
              <FontAwesomeIcon icon={previewOpen ? faFolder : faFolderOpen} />
              {previewOpen ? "Close preview" : "Open preview"}
              <FontAwesomeIcon icon={previewOpen ? faChevronUp : faChevronDown} className="text-[9px]" />
            </button>
          )}
          {canUpload && (
            <>
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
            </>
          )}
        </div>
      </div>

      {isBusy && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          Uploading {uploadingName}...
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
      ) : !previewOpen ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
          Click <span className="font-semibold text-slate-600">Open preview</span> to view {folder.label} reports
        </p>
      ) : (
        <>
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
          {files.length === 0 ? (
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
        </>
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
  const [params, setParams] = useSearchParams();
  const requested = params.get("folder");
  const fromUrl = CASE_FILE_FOLDERS.some((f) => f.value === requested)
    ? (requested as CaseFileFolder)
    : CASE_FILE_FOLDERS[0].value;
  const [active, setActive] = useState<CaseFileFolder>(fromUrl);
  const folder = CASE_FILE_FOLDERS.find((f) => f.value === active) ?? CASE_FILE_FOLDERS[0];

  useEffect(() => {
    setActive(fromUrl);
  }, [fromUrl]);

  function selectTab(value: CaseFileFolder) {
    setActive(value);
    const next = new URLSearchParams(params);
    next.set("folder", value);
    setParams(next, { replace: true });
  }

  return (
    <div
      className="overflow-hidden rounded-3xl border bg-white shadow-sm"
      style={{ borderColor: "#E2E8F0" }}
    >
      <div role="tablist" aria-label="Case report folders" className="grid grid-cols-3 border-b" style={{ borderColor: "#E2E8F0" }}>
        {CASE_FILE_FOLDERS.map((f) => {
          const count = (kase.files ?? []).filter((x) => x.folder === f.value).length;
          const isActive = f.value === active;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(f.value)}
              className="relative flex min-h-[72px] flex-col items-center justify-center gap-1 px-3 py-4 text-center transition-colors sm:min-h-[88px] sm:flex-row sm:gap-3 sm:px-5"
              style={{
                background: isActive ? `${f.color}10` : "white",
                color: isActive ? f.color : "#64748B"
              }}
            >
              {isActive && <span className="absolute inset-x-0 bottom-0 h-1 rounded-t" style={{ background: f.color }} />}
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10"
                style={{ background: isActive ? `${f.color}18` : "#F8FAFC", color: f.color }}
              >
                <FontAwesomeIcon icon={f.icon} className="text-sm sm:text-base" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide sm:text-sm">{f.label}</span>
                <span className="block text-[10px] font-medium sm:text-xs" style={{ color: isActive ? f.color : "#94A3B8" }}>
                  {count} report{count === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <FolderReports key={folder.value} kase={kase} folder={folder} canUpload={canUpload} onChanged={onChanged} />
    </div>
  );
}
