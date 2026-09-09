import PDFDocument from "pdfkit";
import { Response } from "express";

interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

// Generic tabular PDF export - formatted summary style.
// title + optional subtitle, then a simple table of rows.
export function sendPdf(
  res: Response,
  filename: string,
  title: string,
  subtitle: string | undefined,
  columns: ColumnDef[],
  rows: Record<string, any>[]
) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: "left" });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#555").text(subtitle);
    doc.fillColor("#000");
  }
  doc.moveDown(1);

  const startX = doc.x;
  let y = doc.y;
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columns.length;

  // Header row
  doc.fontSize(9).font("Helvetica-Bold");
  columns.forEach((c, i) => {
    doc.text(c.header, startX + i * colWidth, y, { width: colWidth, ellipsis: true });
  });
  y += 18;
  doc.moveTo(startX, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor("#ccc").stroke();
  y += 6;

  // Data rows
  doc.font("Helvetica").fontSize(9);
  rows.forEach((row) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    columns.forEach((c, i) => {
      const value = row[c.key] ?? "";
      doc.text(String(value), startX + i * colWidth, y, { width: colWidth, ellipsis: true });
    });
    y += 16;
  });

  doc.end();
}
// Case report - summary + board item table + visual flow chart.
// Different shape from sendPdf's generic table since it needs a diagram section.
export function sendCaseReportPdf(
  res: Response,
  filename: string,
  kase: {
    caseNumber: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    assignedManager: { name: string } | null;
    boardItems: { id: string; description: string | null; file: { filename: string } }[];
  },
  connections: { fromItemId: string; toItemId: string; label: string | null }[]
) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  // Header - same style as sendPdf
  doc.fontSize(16).text(kase.title, { align: "left" });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#555").text(kase.caseNumber);
  doc.fillColor("#000");
  doc.moveDown(0.6);
  doc.fontSize(10).text(kase.description);
  doc.moveDown(0.4);
  doc
    .fontSize(9)
    .fillColor("#555")
    .text(`Status: ${kase.status}  ·  Priority: ${kase.priority}  ·  Manager: ${kase.assignedManager?.name ?? "-"}`);
  doc.fillColor("#000");
  doc.moveDown(1.2);

  // Summary - plain-language paragraph
  doc.fontSize(13).font("Helvetica-Bold").text("Summary");
  doc.font("Helvetica").fontSize(9).moveDown(0.3);
  doc.text(buildSummary(kase, connections), { lineGap: 3 });
  doc.moveDown(1);

  // Board items - simple table (reusing sendPdf's table look)
  doc.fontSize(13).font("Helvetica-Bold").text("Board Items");
  doc.font("Helvetica").fontSize(9).moveDown(0.4);

  if (kase.boardItems.length === 0) {
    doc.fillColor("#666").text("No items on the board yet.");
    doc.fillColor("#000");
  } else {
    const startX = doc.x;
    let y = doc.y;
    const colWidths = [30, 200, 250]; // #, filename, description

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("#", startX, y, { width: colWidths[0] });
    doc.text("File", startX + colWidths[0], y, { width: colWidths[1] });
    doc.text("Description", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
    y += 16;
    doc.moveTo(startX, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor("#ccc").stroke();
    y += 6;

    doc.font("Helvetica").fontSize(9);
    kase.boardItems.forEach((item, idx) => {
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.text(String(idx + 1), startX, y, { width: colWidths[0] });
      doc.text(item.file.filename, startX + colWidths[0], y, { width: colWidths[1], ellipsis: true });
      doc.text(item.description || "-", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], ellipsis: true });
      y += 16;
    });
    doc.y = y + 10;
  }

  doc.moveDown(1);

  // Visual flow chart
  if (kase.boardItems.length > 0) {
    doc.addPage();
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000").text("Board Flow Chart");
    doc.font("Helvetica").moveDown(0.5);
    drawFlowChart(doc, kase.boardItems, connections);
  }

  doc.end();
}

function buildSummary(
  kase: { boardItems: { description: string | null }[] },
  connections: { fromItemId: string; toItemId: string }[]
): string {
  const count = kase.boardItems.length;
  if (count === 0) return "This case currently has no items on its board.";
  const withNotes = kase.boardItems.filter((i) => i.description).length;
  const connCount = connections.length;

  let text = `This case's board has ${count} item${count === 1 ? "" : "s"} - files and media uploaded as part of this investigation. `;
  if (withNotes > 0) text += `${withNotes} of them include added notes explaining their relevance. `;
  text += connCount > 0
    ? `There ${connCount === 1 ? "is" : "are"} ${connCount} connection${connCount === 1 ? "" : "s"} drawn between items - see the flow chart for how the evidence links together.`
    : `No connections have been drawn between items yet.`;
  return text;
}

function drawFlowChart(
  doc: PDFKit.PDFDocument,
  items: { id: string; description: string | null; file: { filename: string } }[],
  connections: { fromItemId: string; toItemId: string; label: string | null }[]
) {
  const boxW = 150;
  const boxH = 55;
  const gapX = 35;
  const gapY = 45;
  const perRow = 3;
  const startX = doc.page.margins.left;
  const startY = doc.y;
  const positions = new Map<string, { x: number; y: number }>();

  items.forEach((item, idx) => {
    const row = Math.floor(idx / perRow);
    const col = idx % perRow;
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);
    positions.set(item.id, { x, y });

    doc.rect(x, y, boxW, boxH).strokeColor("#6366f1").stroke();
    doc.fontSize(8).fillColor("#000").text(item.file.filename, x + 6, y + 8, { width: boxW - 12, ellipsis: true });
    if (item.description) {
      doc.fontSize(7).fillColor("#666").text(item.description, x + 6, y + 26, { width: boxW - 12, height: boxH - 32, ellipsis: true });
    }
  });

  connections.forEach((conn) => {
    const from = positions.get(conn.fromItemId);
    const to = positions.get(conn.toItemId);
    if (!from || !to) return;
    const fx = from.x + boxW / 2, fy = from.y + boxH / 2;
    const tx = to.x + boxW / 2, ty = to.y + boxH / 2;
    doc.moveTo(fx, fy).lineTo(tx, ty).strokeColor("#6366f1").stroke();
    const angle = Math.atan2(ty - fy, tx - fx);
    const headLen = 8;
    doc
      .moveTo(tx, ty)
      .lineTo(tx - headLen * Math.cos(angle - Math.PI / 6), ty - headLen * Math.sin(angle - Math.PI / 6))
      .lineTo(tx - headLen * Math.cos(angle + Math.PI / 6), ty - headLen * Math.sin(angle + Math.PI / 6))
      .closePath()
      .fillColor("#6366f1")
      .fill();
  });

  const rows = Math.ceil(items.length / perRow);
  doc.y = startY + rows * (boxH + gapY) + 10;
  doc.fillColor("#000");
}