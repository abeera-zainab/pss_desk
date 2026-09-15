import { useEffect, useRef, useState } from "react";
import type { FileDTO } from "@shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { getCachedFileBlob } from "./blobCache";
import { fileExt, getFileIcon, isImageFile, isPdfFile, officeAccent } from "./fileKinds";
import { renderPdfFirstPage } from "./pdf";

function OfficePlaceholder({ file }: { file: FileDTO }) {
  const accent = officeAccent(file.filename);
  const ext = fileExt(file.filename) || "file";
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="h-2 w-full shrink-0" style={{ background: accent }} />
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2 py-3">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
          style={{ background: accent }}
        >
          {ext}
        </span>
        <FontAwesomeIcon icon={getFileIcon(file.filename)} className="text-lg" style={{ color: accent }} />
        <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-slate-600">
          {file.filename}
        </span>
      </div>
    </div>
  );
}

export function DocumentThumbnail({
  file,
  className = ""
}: {
  file: FileDTO;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const isImage = isImageFile(file);
  const isPdf = isPdfFile(file);

  useEffect(() => {
    if (!isImage && !isPdf) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    setFailed(false);
    setLoading(true);
    getCachedFileBlob(file.id)
      .then(async (blob) => {
        if (cancelled) return;
        if (isImage) {
          url = URL.createObjectURL(blob);
          setImageSrc(url);
          setLoading(false);
          return;
        }
        let canvas = canvasRef.current;
        if (!canvas) {
          await new Promise((r) => requestAnimationFrame(r));
          canvas = canvasRef.current;
        }
        if (!canvas) throw new Error("PDF thumbnail canvas not mounted");
        const width = Math.max(wrapRef.current?.clientWidth || 0, 160);
        await renderPdfFirstPage(blob, canvas, width);
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, isImage, isPdf]);

  if (!isImage && !isPdf) {
    return (
      <div className={`h-full w-full overflow-hidden ${className}`}>
        <OfficePlaceholder file={file} />
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`h-full w-full overflow-hidden ${className}`}>
        <OfficePlaceholder file={file} />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`relative h-full w-full overflow-hidden bg-slate-100 ${className}`}>
      {isImage && imageSrc ? (
        <img src={imageSrc} alt={file.filename} className="h-full w-full object-cover" />
      ) : (
        <canvas ref={canvasRef} className={`h-full w-full object-cover object-top ${loading ? "opacity-0" : "opacity-100"}`} />
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
        </div>
      )}
    </div>
  );
}
