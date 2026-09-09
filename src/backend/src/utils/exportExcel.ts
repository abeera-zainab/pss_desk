import ExcelJS from "exceljs";
import { Response } from "express";

interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

// Generic row-based Excel export. Any report/list can call this with its own columns + rows.
export async function sendExcel(
  res: Response,
  filename: string,
  sheetName: string,
  columns: ColumnDef[],
  rows: Record<string, any>[]
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}