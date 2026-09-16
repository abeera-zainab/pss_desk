import { useState } from "react";
import { Link } from "react-router-dom";
import type { CaseDTO, CaseFileFolder, FileDTO } from "@shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faFolderOpen, faFolder } from "@fortawesome/free-solid-svg-icons";
import { CASE_FILE_FOLDERS } from "./folders";
import { DriveFileCard } from "./DriveFileCard";
import { Badge } from "../ui";
import { CASE_STATUS_BADGE } from "../../lib/meta";

export function CaseFolderTabs({
  cases,
  active,
  onChange,
  onOpenFile
}: {
  cases: CaseDTO[];
  active: CaseFileFolder;
  onChange: (folder: CaseFileFolder) => void;
  onOpenFile: (file: FileDTO) => void;
}) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const folder = CASE_FILE_FOLDERS.find((f) => f.value === active) ?? CASE_FILE_FOLDERS[0];
  const rows = cases
    .map((kase) => ({
      kase,
      files: (kase.files ?? []).filter((f) => f.folder === active)
    }))
    .filter((row) => row.files.length > 0);

  function isOpen(id: string) {
    return Boolean(openIds[id]);
  }

  function toggle(id: string) {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-sm" style={{ borderColor: "#E2E8F0" }}>
      <div role="tablist" aria-label="Report folders" className="grid grid-cols-3 border-b" style={{ borderColor: "#E2E8F0" }}>
        {CASE_FILE_FOLDERS.map((f) => {
          const count = cases.reduce((n, kase) => n + (kase.files ?? []).filter((x) => x.folder === f.value).length, 0);
          const isActive = f.value === active;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(f.value)}
              className="relative flex min-h-[72px] flex-col items-center justify-center gap-1 px-3 py-4 text-center transition-colors sm:min-h-[88px] sm:flex-row sm:gap-3 sm:px-5"
              style={{
                background: isActive ? `${f.color}10` : "white",
                color: isActive ? f.color : "#64748B"
              }}
            >
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-1 rounded-t" style={{ background: f.color }} />
              )}
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

      <div className="p-4 sm:p-5">
        <p className="mb-4 text-[11px] text-slate-400">{folder.hint}</p>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No {folder.label} reports yet</p>
        ) : (
          <div className="space-y-6">
            {rows.map(({ kase, files }) => {
              const expanded = isOpen(kase.id);
              return (
              <section key={kase.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/cases/${kase.id}?folder=${active}`} className="min-w-0 hover:text-indigo-600">
                    <span className="block truncate text-sm font-bold" style={{ color: "#1A1D23" }}>
                      {kase.caseNumber} · {kase.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {files.length} file{files.length === 1 ? "" : "s"} in {folder.label}
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={CASE_STATUS_BADGE[kase.status] + " px-2 py-0.5 text-[10px]"}>
                      {kase.status.replaceAll("_", " ")}
                    </Badge>
                    <button
                      type="button"
                      title={expanded ? "Close reports preview" : "Open reports preview"}
                      aria-expanded={expanded}
                      onClick={() => toggle(kase.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                      style={{
                        borderColor: expanded ? folder.color : "#E2E8F0",
                        background: expanded ? `${folder.color}12` : "white",
                        color: expanded ? folder.color : "#64748B"
                      }}
                    >
                      <FontAwesomeIcon icon={expanded ? faFolder : faFolderOpen} />
                      <span>{expanded ? "Close" : "Open"}</span>
                      <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-[9px]" />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {files.map((file) => (
                      <DriveFileCard key={file.id} file={file} onOpen={() => onOpenFile(file)} />
                    ))}
                  </div>
                )}
              </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
