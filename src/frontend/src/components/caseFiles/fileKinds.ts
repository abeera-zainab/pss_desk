import type { FileDTO } from "@shared/types";
import {
  faFileAlt,
  faFileArchive,
  faFileCode,
  faFileExcel,
  faFilePdf,
  faFileWord,
  faImage,
  faVideo
} from "@fortawesome/free-solid-svg-icons";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "ico"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm"]);

export function fileExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function isImageFile(f: FileDTO) {
  return IMAGE_EXTENSIONS.has(fileExt(f.filename)) || (f.mimetype || "").startsWith("image/");
}

export function isPdfFile(f: FileDTO) {
  return fileExt(f.filename) === "pdf" || f.mimetype === "application/pdf";
}

export function isVideoFile(f: FileDTO) {
  return VIDEO_EXTENSIONS.has(fileExt(f.filename)) || (f.mimetype || "").startsWith("video/");
}

export function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return faFilePdf;
  if (IMAGE_EXTENSIONS.has(ext || "")) return faImage;
  if (VIDEO_EXTENSIONS.has(ext || "")) return faVideo;
  if (["doc", "docx"].includes(ext || "")) return faFileWord;
  if (["xls", "xlsx", "csv"].includes(ext || "")) return faFileExcel;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) return faFileArchive;
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "xml"].includes(ext || "")) return faFileCode;
  return faFileAlt;
}

export function officeAccent(filename: string) {
  const ext = fileExt(filename);
  if (ext === "pdf") return "#DC2626";
  if (["doc", "docx"].includes(ext)) return "#2563EB";
  if (["xls", "xlsx", "csv"].includes(ext)) return "#059669";
  if (["zip", "rar", "7z"].includes(ext)) return "#D97706";
  return "#6366F1";
}
