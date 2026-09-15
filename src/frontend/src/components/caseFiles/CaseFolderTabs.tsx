import { useState } from "react";
import type { CaseDTO, CaseFileFolder } from "@shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CASE_FILE_FOLDERS } from "./folders";
import { CardFolderBlock } from "./CardFolderBlock";

export function CaseFolderTabs({
  kase,
  canUpload,
  onChanged
}: {
  kase: CaseDTO;
  canUpload: boolean;
  onChanged: () => void;
}) {
  const [active, setActive] = useState<CaseFileFolder>(CASE_FILE_FOLDERS[0].value);
  const folder = CASE_FILE_FOLDERS.find((f) => f.value === active) ?? CASE_FILE_FOLDERS[0];
  const filesByFolder = (kase.files ?? []).filter((f) => f.folder === active);

  return (
    <div>
      <div role="tablist" aria-label="Case report folders" className="mb-3 flex flex-wrap gap-1.5">
        {CASE_FILE_FOLDERS.map((f) => {
          const isActive = f.value === active;
          const count = (kase.files ?? []).filter((x) => x.folder === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActive(f.value);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                isActive ? "text-white shadow-sm" : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              }`}
              style={isActive ? { background: `linear-gradient(135deg, ${f.color}, ${f.color}cc)` } : undefined}
            >
              <FontAwesomeIcon icon={f.icon} className="text-[9px]" />
              <span>{f.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${isActive ? "bg-white/25 text-white" : "text-indigo-600"}`}
                  style={!isActive ? { background: "#EEF2FF" } : undefined}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <CardFolderBlock key={active} kase={kase} folder={folder} canUpload={canUpload} onChanged={onChanged} defaultExpanded />
      {filesByFolder.length === 0 && (
        <p className="mt-2 text-center text-[10px] italic" style={{ color: "#94A3B8" }}>
          This tab is empty for {kase.caseNumber} — upload {folder.label} reports above, or switch tabs.
        </p>
      )}
    </div>
  );
}
