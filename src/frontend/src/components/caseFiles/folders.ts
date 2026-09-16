import type { CaseFileFolder } from "@shared/types";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faExclamationTriangle, faGlobe, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";

export type CaseFolderMeta = {
  value: CaseFileFolder;
  slug: string;
  label: string;
  hint: string;
  icon: IconDefinition;
  color: string;
};

export const CASE_FILE_FOLDERS: CaseFolderMeta[] = [
  {
    value: "INITIAL_OSINT",
    slug: "osint",
    label: "Initial OSINT",
    hint: "Open Source Intelligence & Prior Case Dossiers",
    icon: faGlobe,
    color: "#3B82F6"
  },
  {
    value: "LOCATION_ANALYSIS",
    slug: "geoint",
    label: "GEOINT",
    hint: "Geographic Intelligence, Maps & Coordinates",
    icon: faMapMarkerAlt,
    color: "#10B981"
  },
  {
    value: "THREAT_ALERT",
    slug: "threat-alert",
    label: "Threat Alert",
    hint: "Threat Assessments, Bulletins & Priority Packages",
    icon: faExclamationTriangle,
    color: "#EF4444"
  }
];

export function folderMeta(value: CaseFileFolder): CaseFolderMeta {
  return CASE_FILE_FOLDERS.find((f) => f.value === value) ?? CASE_FILE_FOLDERS[0];
}

export function folderBySlug(slug: string | undefined): CaseFolderMeta | undefined {
  return CASE_FILE_FOLDERS.find((f) => f.slug === slug);
}
