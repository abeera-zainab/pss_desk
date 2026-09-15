import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FileDTO } from "@shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faSpinner, faTimes } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../lib/api";
import { formatDate, fileSize } from "../../lib/format";
import { getCachedFileBlob } from "./blobCache";
import { getFileIcon, isImageFile, isPdfFile } from "./fileKinds";
import { renderPdfDocument } from "./pdf";

function PdfViewer({ blob }: { blob: Blob }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let renderSignal = { cancelled: false };
    let timer: number | undefined;

    const run = () => {
      renderSignal.cancelled = true;
      renderSignal = { cancelled: false };
      const signal = renderSignal;
      const width = Math.max(320, host.clientWidth || window.innerWidth);
      setFailed(false);
      setLoading(true);
      renderPdfDocument(blob, host, { signal, fitWidth: width })
        .then(() => {
          if (!cancelled && !signal.cancelled) setLoading(false);
        })
        .catch(() => {
          if (!cancelled && !signal.cancelled) {
            setFailed(true);
            setLoading(false);
          }
        });
    };

    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 120);
    });
    ro.observe(host);
    run();

    return () => {
      cancelled = true;
      renderSignal.cancelled = true;
      window.clearTimeout(timer);
      ro.disconnect();
      host.replaceChildren();
    };
  }, [blob]);

  if (failed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
        <p className="text-sm font-semibold">Could not render this PDF</p>
        <p className="text-xs">Use the download button above to view it.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-indigo-400">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" />
        </div>
      )}
      <div ref={hostRef} className="w-full" />
    </div>
  );
}

export function CaseFilePreview({ file, onClose }: { file: FileDTO; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = isImageFile(file);
  const isPdf = isPdfFile(file);

  useEffect(() => {
    if (!isImage && !isPdf) return;
    let cancelled = false;
    let url: string | null = null;
    getCachedFileBlob(file.id)
      .then((next) => {
        if (cancelled) return;
        setBlob(next);
        if (isImage) {
          url = URL.createObjectURL(next);
          setSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, isImage, isPdf]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900" title={file.filename}>
            {file.filename}
          </span>
          <span className="text-[11px] text-slate-500">
            {fileSize(file.size)} · {formatDate(file.createdAt)}
            {file.uploader?.name ? ` · ${file.uploader.name}` : ""}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Download"
            onClick={() => api.downloadFile(file.id, file.filename)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <FontAwesomeIcon icon={faDownload} />
          </button>
          <button
            type="button"
            title="Close (Esc)"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-slate-100">
        {isImage && src ? (
          <img src={src} alt={file.filename} className="mx-auto h-auto w-full max-w-none object-contain" />
        ) : isPdf && blob ? (
          <PdfViewer blob={blob} />
        ) : failed || (!isImage && !isPdf) ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
            <FontAwesomeIcon icon={getFileIcon(file.filename)} className="text-4xl" />
            <p className="text-sm font-semibold">Preview not available for this file type</p>
            <p className="text-xs">Use the download button above to view it.</p>
          </div>
        ) : (
          <div className="flex min-h-[50vh] items-center justify-center text-indigo-400">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
