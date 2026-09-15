import { useRef, useState } from "react";
import type { CaseDTO, FileDTO } from "@shared/types";
import { CaseFilePreview } from "./CaseFilePreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faFolder, faSearch, faSpinner, faUpload } from "@fortawesome/free-solid-svg-icons";
import { api, apiError } from "../../lib/api";
import { fileSize } from "../../lib/format";
import { extractFilesFromDropEvent } from "./dropFiles";
import { isImageFile, isPdfFile } from "./fileKinds";
import type { CaseFolderMeta } from "./folders";
import { CardFileRow } from "./CardFileRow";
import { DocumentThumbnail } from "./DocumentThumbnail";

export function CardFolderBlock({
  kase,
  folder,
  canUpload,
  onChanged,
  defaultExpanded
}: {
  kase: CaseDTO;
  folder: CaseFolderMeta;
  canUpload: boolean;
  onChanged: () => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [search, setSearch] = useState("");
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const dirInput = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<FileDTO | null>(null);

  const allFiles = (kase.files ?? []).filter((f) => f.folder === folder.value);
  const query = search.toLowerCase().trim();
  const files = query ? allFiles.filter((f) => f.filename.toLowerCase().includes(query)) : allFiles;
  const totalBytes = allFiles.reduce((acc, f) => acc + f.size, 0);
  const isBusy = uploadingName !== null;
  const imgCount = files.filter(isImageFile).length;

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
    <>
      <div
        className={`overflow-hidden rounded-xl border bg-white transition-all duration-300 ${
          dragOver ? "border-dashed border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-200" : "border-slate-200"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (canUpload && !dragOver) setDragOver(true);
        }}
        onDragLeave={() => {
          if (dragOver) setDragOver(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (!canUpload) return;
          const droppedFiles = await extractFilesFromDropEvent(e);
          if (droppedFiles.length) upload(droppedFiles);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px]"
              style={{ background: `${folder.color}15`, color: folder.color }}
            >
              <FontAwesomeIcon icon={folder.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#1A1D23" }}>
                {folder.label}
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: "#EEF2FF", color: "#6366F1" }}>
                  {allFiles.length}
                </span>
                {allFiles.length > 0 && (
                  <span className="text-[9px] font-normal" style={{ color: "#94A3B8" }}>
                    ({fileSize(totalBytes)})
                  </span>
                )}
              </span>
              <span className="hidden truncate text-[9px] sm:block" style={{ color: "#94A3B8" }}>
                {folder.hint}
              </span>
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`shrink-0 text-[8px] text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {canUpload && (
            <span className="flex shrink-0 items-center gap-1">
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
                title="Upload files"
                disabled={isBusy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInput.current?.click();
                }}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faUpload} className="text-[8px]" /> Files
              </button>
              <button
                type="button"
                title="Upload entire folder"
                disabled={isBusy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dirInput.current?.click();
                }}
                className="rounded-md px-2 py-1 text-[9px] font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
              >
                <FontAwesomeIcon icon={faFolder} className="text-[8px]" /> Folder
              </button>
            </span>
          )}
        </div>

        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-2.5 py-2">
            {isBusy && (
              <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-1.5 text-[9px] font-medium text-indigo-700">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-indigo-500" />
                <span className="truncate">Uploading {uploadingName}...</span>
              </div>
            )}

            {dragOver && (
              <div className="mb-1.5 rounded-md border-2 border-dashed border-indigo-300 bg-indigo-50/70 py-2.5 text-center">
                <p className="text-[10px] font-semibold text-indigo-700">Drop files or a folder here → {folder.label}</p>
              </div>
            )}

            {files.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
                    Previews
                  </span>
                  <span className="text-[9px]" style={{ color: "#94A3B8" }}>
                    {imgCount} image{imgCount === 1 ? "" : "s"} · {files.length} file{files.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {files.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      title={`Preview ${f.filename}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPreview(f);
                      }}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                    >
                      <DocumentThumbnail file={f} />
                      <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-0.5 pt-3 text-left text-[8px] font-semibold text-white">
                        {isPdfFile(f) ? "PDF" : isImageFile(f) ? "Image" : "Doc"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allFiles.length > 0 && (
              <div className="relative mb-1.5">
                <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${allFiles.length} files...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1 pl-5 pr-2 text-[10px] text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                />
              </div>
            )}

            {allFiles.length === 0 ? (
              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-slate-200 py-2.5 text-center transition-colors duration-200 hover:border-indigo-300"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (canUpload) fileInput.current?.click();
                }}
              >
                <FontAwesomeIcon icon={folder.icon} className="text-[11px] text-slate-300" />
                <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                  {canUpload ? "No documents yet — click to upload previous reports" : "No documents in this folder yet"}
                </span>
              </button>
            ) : files.length === 0 ? (
              <p className="py-2 text-center text-[10px] text-slate-400">No files match "{search}"</p>
            ) : (
              <div className="max-h-44 space-y-0.5 overflow-y-auto pr-0.5">
                {files.map((f) => (
                  <CardFileRow
                    key={f.id}
                    file={f}
                    canDelete={canUpload}
                    onDelete={handleDelete}
                    onOpen={() => setPreview(f)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {preview && <CaseFilePreview file={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
