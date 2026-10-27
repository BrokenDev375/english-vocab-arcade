import { readSheet, type CellValue } from "read-excel-file/universal";

/**
 * Parse an XLSX file (from browser File, Blob, or ArrayBuffer)
 * Returns a 2D array of string values.
 */
export async function parseXlsx(
  fileOrBuffer: Blob | ArrayBuffer
): Promise<string[][]> {
  try {
    const rawRows = await readSheet(fileOrBuffer);

    const rows: string[][] = [];

    for (const rawRow of rawRows) {
      const rowStrings: string[] = rawRow.map((cell: CellValue | null) => {
        if (cell === null || cell === undefined) {
          return "";
        }
        if (cell instanceof Date) {
          return cell.toISOString();
        }
        return String(cell).trim();
      });

      // Only include non-empty rows
      if (rowStrings.some((val) => val.length > 0)) {
        rows.push(rowStrings);
      }
    }

    return rows;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi đọc tệp Excel (.xlsx)";
    throw new Error(`Không thể phân tích tệp Excel: ${msg}`);
  }
}
