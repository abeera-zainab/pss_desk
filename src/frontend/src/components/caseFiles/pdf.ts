import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Query string avoids a stale immutable cache of this file as octet-stream
// (nginx used to serve .mjs that way). The file itself is unchanged.
pdfjs.GlobalWorkerOptions.workerSrc = `${workerUrl}?js=1`;

export async function renderPdfFirstPage(blob: Blob, canvas: HTMLCanvasElement, maxWidth: number) {
  const data = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(0.4, maxWidth / base.width));
    const viewport = page.getViewport({ scale });
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
  } finally {
    await pdf.destroy();
  }
}

export async function renderPdfDocument(
  blob: Blob,
  host: HTMLElement,
  options?: { maxPages?: number; scale?: number; fitWidth?: number; signal?: { cancelled: boolean } }
) {
  const data = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const maxPages = Math.min(pdf.numPages, options?.maxPages ?? pdf.numPages);
  let scale = options?.scale ?? 1.75;
  if (options?.fitWidth) {
    const first = await pdf.getPage(1);
    const base = first.getViewport({ scale: 1 });
    scale = Math.min(3.2, Math.max(0.6, options.fitWidth / base.width));
  }
  host.replaceChildren();
  try {
    for (let i = 1; i <= maxPages; i++) {
      if (options?.signal?.cancelled) return;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const frame = document.createElement("figure");
      frame.className = options?.fitWidth ? "mb-0 w-full" : "mx-auto mb-8 w-full max-w-[816px]";
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.className = options?.fitWidth
        ? "block h-auto w-full bg-white"
        : "h-auto w-full bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]";
      canvas.setAttribute("aria-label", `Page ${i} of ${pdf.numPages}`);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      frame.appendChild(canvas);
      if (!options?.fitWidth) {
        const caption = document.createElement("figcaption");
        caption.className = "mt-2 text-center text-[11px] tracking-wide text-slate-500";
        caption.textContent = `Page ${i} of ${pdf.numPages}`;
        frame.appendChild(caption);
      }
      host.appendChild(frame);
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
  } finally {
    await pdf.destroy();
  }
}
