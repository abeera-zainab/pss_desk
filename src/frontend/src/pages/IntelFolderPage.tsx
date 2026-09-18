import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { CaseDTO, FileDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { useAuth } from "../store/auth";
import { Badge, Spinner } from "../components/ui";
import { CASE_STATUS_BADGE } from "../lib/meta";
import { CASE_FILE_FOLDERS, CaseFilePreview, DriveFileCard, folderBySlug } from "../components/caseFiles";
import { extractFilesFromDropEvent } from "../components/caseFiles/dropFiles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faSpinner, faUpload } from "@fortawesome/free-solid-svg-icons";

export default function IntelFolderPage() {
  const { slug } = useParams<{ slug: string }>();
  const folder = folderBySlug(slug);
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<FileDTO | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const headerInput = useRef<HTMLInputElement | null>(null);

  function load(silent = false) {
    if (!silent) setLoading(true);
    api
      .getCases({ limit: 100 })
      .then((response) => {
        let data: unknown = response;
        if (response && typeof response === "object" && "data" in response && Array.isArray((response as { data: unknown }).data)) {
          data = (response as { data: CaseDTO[] }).data;
        }
        setCases(Array.isArray(data) ? data : []);
      })
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPreview(null);
    setOpenIds({});
    load();
  }, [slug]);

  if (!folder) return <Navigate to="/cases" replace />;
  const activeFolder = folder;

  function canManage(kase: CaseDTO) {
    if (user?.role === "ADMIN") return true;
    return user?.role === "MANAGER" && kase.assignedManagerId === user.id;
  }

  const uploadTargets = cases.filter(canManage);
  const canUploadHere = uploadTargets.length > 0;
  const defaultCase = uploadTargets[0];

  const rows = cases.map((kase) => ({
    kase,
        files: (kase.files ?? []).filter((f) => f.folder === activeFolder.value)
  }));

  async function uploadTo(caseId: string, list: FileList | File[]) {
    const arr = Array.from(list).filter((f) => f && f.size > 0);
    if (arr.length === 0) return;
    try {
      for (const f of arr) {
        setUploadingName(f.name);
        await api.uploadCaseFile(caseId, f, activeFolder.value);
      }
      load(true);
    } catch (err) {
      alert(apiError(err));
    } finally {
      setUploadingName(null);
    }
  }

  async function handleDelete(caseId: string, fileId: string, filename: string) {
    if (!window.confirm(`Delete "${filename}" from ${activeFolder.label}?`)) return;
    try {
      await api.deleteCaseFile(caseId, fileId);
      load(true);
    } catch (err) {
      alert(apiError(err));
    }
  }

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{ background: dragOver ? `${folder.color}08` : "#F8FAFC" }}
      onDragOver={(e) => {
        e.preventDefault();
        if (canUploadHere) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOver(false);
        if (!defaultCase) return;
        const dropped = await extractFilesFromDropEvent(e);
        if (dropped.length) uploadTo(defaultCase.id, dropped);
      }}
    >
      <input
        ref={headerInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (defaultCase && e.target.files?.length) uploadTo(defaultCase.id, e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: folder.color }}
          >
            <FontAwesomeIcon icon={folder.icon} className="text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
              {folder.label}
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              {folder.hint}
            </p>
          </div>
        </div>
        {canUploadHere && (
          <button
            type="button"
            disabled={!defaultCase || uploadingName !== null}
            onClick={() => headerInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
            style={{ background: folder.color }}
          >
            <FontAwesomeIcon icon={uploadingName ? faSpinner : faUpload} className={uploadingName ? "animate-spin" : ""} />
            {uploadingName ? `Uploading ${uploadingName}` : "Upload reports"}
          </button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-3xl border bg-white shadow-sm" style={{ borderColor: "#E2E8F0" }}>
        {CASE_FILE_FOLDERS.map((f) => {
          const isActive = f.slug === folder.slug;
          return (
            <Link
              key={f.slug}
              to={`/intelligence/${f.slug}`}
              className="relative flex min-h-[72px] flex-col items-center justify-center gap-1 px-3 py-4 text-center sm:min-h-[88px] sm:flex-row sm:gap-3"
              style={{
                background: isActive ? `${f.color}10` : "white",
                color: isActive ? f.color : "#64748B"
              }}
            >
              {isActive && <span className="absolute inset-x-0 bottom-0 h-1 rounded-t" style={{ background: f.color }} />}
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: isActive ? `${f.color}18` : "#F8FAFC", color: f.color }}
              >
                <FontAwesomeIcon icon={f.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide sm:text-sm">{f.label}</span>
              </span>
              <FontAwesomeIcon icon={isActive ? faChevronUp : faChevronDown} className="text-[10px] opacity-70" />
            </Link>
          );
        })}
      </div>

      {dragOver && canUploadHere && (
        <p className="mb-4 rounded-2xl border-2 border-dashed py-4 text-center text-sm font-semibold" style={{ borderColor: folder.color, color: folder.color }}>
          Drop files to upload into {folder.label}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border bg-white py-16 text-center text-sm text-slate-400" style={{ borderColor: "#E2E8F0" }}>
          Create a case first, then upload {folder.label} reports here
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map(({ kase, files }) => {
            const expanded = Boolean(openIds[kase.id]);
            return (
            <section key={kase.id} className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5" style={{ borderColor: "#E2E8F0" }}>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  aria-expanded={expanded}
                  onClick={() => setOpenIds((prev) => ({ ...prev, [kase.id]: !prev[kase.id] }))}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold" style={{ color: "#1A1D23" }}>
                      {kase.caseNumber} · {kase.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {files.length} report{files.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <FontAwesomeIcon
                    icon={expanded ? faChevronUp : faChevronDown}
                    className="shrink-0 text-xs"
                    style={{ color: expanded ? folder.color : "#94A3B8" }}
                  />
                </button>
                <Badge className={CASE_STATUS_BADGE[kase.status] + " px-2 py-0.5 text-[10px]"}>
                  {kase.status.replaceAll("_", " ")}
                </Badge>
              </div>
              {expanded && (
                <div className="mt-4">
                  {files.length === 0 ? (
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-dashed py-10 text-center text-sm text-slate-400 hover:border-indigo-300"
                      style={{ borderColor: "#E2E8F0" }}
                      onClick={() => canManage(kase) && headerInput.current?.click()}
                    >
                      {canManage(kase) ? `No ${folder.label} reports yet — click Upload reports or drop files here` : `No ${folder.label} reports yet`}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {files.map((file) => (
                        <DriveFileCard
                          key={file.id}
                          file={file}
                          canDelete={canManage(kase)}
                          onOpen={() => setPreview(file)}
                          onDelete={(id, name) => handleDelete(kase.id, id, name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
            );
          })}
        </div>
      )}
      {preview && <CaseFilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
