import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { CaseDTO, FileDTO } from "@shared/types";
import { api } from "../lib/api";
import { Badge, Spinner } from "../components/ui";
import { CASE_STATUS_BADGE } from "../lib/meta";
import { CASE_FILE_FOLDERS, CaseFilePreview, DriveFileCard, folderBySlug } from "../components/caseFiles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faFolder, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

export default function IntelFolderPage() {
  const { slug } = useParams<{ slug: string }>();
  const folder = folderBySlug(slug);
  const [cases, setCases] = useState<CaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<FileDTO | null>(null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPreview(null);
    setOpenIds({});
    setLoading(true);
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
  }, [slug]);

  if (!folder) return <Navigate to="/cases" replace />;

  const rows = cases
    .map((kase) => ({
      kase,
      files: (kase.files ?? []).filter((f) => f.folder === folder.value)
    }))
    .filter((row) => row.files.length > 0);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: "#F8FAFC" }}>
      <div className="mb-6 flex items-center gap-3">
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

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border bg-white py-16 text-center text-sm text-slate-400" style={{ borderColor: "#E2E8F0" }}>
          No {folder.label} reports yet
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map(({ kase, files }) => {
            const expanded = Boolean(openIds[kase.id]);
            return (
              <section key={kase.id} className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/cases/${kase.id}?folder=${folder.value}`} className="min-w-0">
                    <span className="block truncate text-sm font-bold" style={{ color: "#1A1D23" }}>
                      {kase.caseNumber} · {kase.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {files.length} report{files.length === 1 ? "" : "s"}
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={CASE_STATUS_BADGE[kase.status] + " px-2 py-0.5 text-[10px]"}>
                      {kase.status.replaceAll("_", " ")}
                    </Badge>
                    <button
                      type="button"
                      title={expanded ? "Close reports preview" : "Open reports preview"}
                      onClick={() => setOpenIds((prev) => ({ ...prev, [kase.id]: !prev[kase.id] }))}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold"
                      style={{
                        borderColor: expanded ? folder.color : "#E2E8F0",
                        background: expanded ? `${folder.color}12` : "white",
                        color: expanded ? folder.color : "#64748B"
                      }}
                    >
                      <FontAwesomeIcon icon={expanded ? faFolder : faFolderOpen} />
                      {expanded ? "Close" : "Open"}
                      <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-[9px]" />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {files.map((file) => (
                      <DriveFileCard key={file.id} file={file} onOpen={() => setPreview(file)} />
                    ))}
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
