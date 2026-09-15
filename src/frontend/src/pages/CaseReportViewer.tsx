import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CaseDTO, FileDTO } from "@shared/types";
import { FontAwesomeIcon as Fa } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faDownload,
  faPrint,
  faSpinner
} from "@fortawesome/free-solid-svg-icons";
import { api, apiError } from "../lib/api";
import { formatDate, fileSize } from "../lib/format";
import { ErrorText, Spinner } from "../components/ui";
import pssLogo from "../assets/pss-logo-removebg-preview.png";
import { getCachedFileBlob } from "../components/caseFiles/blobCache";
import { getFileIcon, isImageFile, isPdfFile } from "../components/caseFiles/fileKinds";
import { folderMeta } from "../components/caseFiles/folders";
import { renderPdfDocument } from "../components/caseFiles/pdf";

function PdfPages({ blob }: { blob: Blob }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const signal = { cancelled: false };
    setFailed(false);
    setLoading(true);
    renderPdfDocument(blob, host, { scale: 1.75, signal })
      .then(() => {
        if (!signal.cancelled) setLoading(false);
      })
      .catch(() => {
        if (!signal.cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      signal.cancelled = true;
      host.replaceChildren();
    };
  }, [blob]);

  if (failed) {
    return (
      <div className="mx-auto max-w-[816px] bg-white px-10 py-24 text-center text-slate-500 shadow-lg">
        <p className="text-sm font-semibold text-slate-700">This PDF could not be rendered in the browser</p>
        <p className="mt-2 text-xs">Download the file to open it in a desktop reader.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="flex justify-center py-24 text-indigo-500">
          <Fa icon={faSpinner} className="animate-spin text-3xl" />
        </div>
      )}
      <div ref={hostRef} className={loading ? "min-h-[40vh]" : ""} />
    </div>
  );
}

export default function CaseReportViewer() {
  const { id, fileId } = useParams<{ id: string; fileId: string }>();
  const navigate = useNavigate();
  const [kase, setKase] = useState<CaseDTO | null>(null);
  const [error, setError] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [blobFailed, setBlobFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getCase(id)
      .then(setKase)
      .catch((e) => setError(apiError(e)));
  }, [id]);

  const file: FileDTO | undefined = kase?.files?.find((f) => f.id === fileId);
  const isImage = file ? isImageFile(file) : false;
  const isPdf = file ? isPdfFile(file) : false;
  const folder = file?.folder ? folderMeta(file.folder) : null;

  useEffect(() => {
    if (!file || (!isImage && !isPdf)) return;
    let cancelled = false;
    let url: string | null = null;
    setBlob(null);
    setSrc(null);
    setBlobFailed(false);
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
        if (!cancelled) setBlobFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file?.id, isImage, isPdf]);

  if (error) {
    return (
      <div className="p-10">
        <ErrorText message={error} />
        <Link to="/cases" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to cases
        </Link>
      </div>
    );
  }
  if (!kase) return <Spinner />;
  if (!file) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#E8EAED] p-8">
        <p className="text-sm font-semibold text-slate-700">Report not found in this case</p>
        <button type="button" className="text-sm text-indigo-600 hover:underline" onClick={() => navigate(`/cases/${kase.id}`)}>
          Return to case
        </button>
      </div>
    );
  }

  return (
    <div className="report-viewer min-h-screen bg-[#E8EAED]">
      <style>{`
        @media print {
          aside, header, .report-viewer-toolbar { display: none !important; }
          .report-viewer { background: white !important; }
          .report-viewer-stage { padding: 0 !important; }
        }
      `}</style>

      <div className="report-viewer-toolbar sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to={`/cases/${kase.id}`}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              <Fa icon={faArrowLeft} className="text-xs" />
              Case
            </Link>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">
                {kase.caseNumber}
                {folder ? ` · ${folder.label}` : ""}
              </p>
              <p className="truncate text-sm font-semibold text-slate-900" title={file.filename}>
                {file.filename}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Fa icon={faPrint} />
              Print
            </button>
            <button
              type="button"
              onClick={() => api.downloadFile(file.id, file.filename)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Fa icon={faDownload} />
              Download
            </button>
          </div>
        </div>
      </div>

      <div className="report-viewer-stage px-4 py-8 sm:px-8">
        <article className="mx-auto mb-8 w-full max-w-[816px] bg-white px-10 py-8 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
              <img src={pssLogo} alt="PSS" className="h-16 w-16 object-contain" />
              <div>
                <p className="text-lg font-bold tracking-tight text-slate-900">Pak Surveillance Shield</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Internal case report</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-800">{kase.caseNumber}</p>
              <p>{kase.title}</p>
              {folder && (
                <p className="mt-1 font-medium" style={{ color: folder.color }}>
                  {folder.label}
                </p>
              )}
            </div>
          </header>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-slate-600 sm:grid-cols-4">
            <div>
              <dt className="uppercase tracking-wider text-slate-400">Document</dt>
              <dd className="mt-0.5 break-all font-medium text-slate-800">{file.filename}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-slate-400">Size</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{fileSize(file.size)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-slate-400">Filed</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatDate(file.createdAt)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-slate-400">Uploaded by</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{file.uploader?.name || "—"}</dd>
            </div>
          </dl>
        </article>

        {isPdf && blob ? (
          <PdfPages blob={blob} />
        ) : isImage && src ? (
          <figure className="mx-auto w-full max-w-[816px] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
            <img src={src} alt={file.filename} className="mx-auto h-auto max-w-full" />
          </figure>
        ) : blobFailed || (!isImage && !isPdf) ? (
          <div className="mx-auto flex max-w-[816px] flex-col items-center gap-3 bg-white px-10 py-20 text-center shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
            <Fa icon={getFileIcon(file.filename)} className="text-5xl text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">In-browser preview is not available for this file type</p>
            <p className="text-xs text-slate-500">Download the original to open it in the appropriate application.</p>
            <button
              type="button"
              onClick={() => api.downloadFile(file.id, file.filename)}
              className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Download original
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-24 text-indigo-500">
            <Fa icon={faSpinner} className="animate-spin text-3xl" />
          </div>
        )}
      </div>
    </div>
  );
}
