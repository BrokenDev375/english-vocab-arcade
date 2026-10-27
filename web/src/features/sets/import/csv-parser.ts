/**
 * Pure TypeScript CSV Parser.
 * Compliant with RFC 4180:
 * - Supports fields enclosed in double quotes
 * - Supports escaped double quotes ("") inside quoted fields
 * - Supports newlines (CR, LF, CRLF) within quoted fields
 * - Strips UTF-8 BOM if present
 * - Preserves Unicode/Vietnamese characters
 */
export function parseCsv(rawText: string): string[][] {
  if (!rawText) return [];

  // Remove UTF-8 BOM if present
  let text = rawText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        // Look ahead for escaped double quote ("")
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        // Any character inside quotes (including \n, \r, commas) is treated as field text
        currentField += char;
        i++;
        continue;
      }
    } else {
      // Outside of quotes
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        // Check for \r\n
        if (i + 1 < len && text[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = "";
        // Only push row if it contains at least one non-empty field
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push last field and row if any
  currentRow.push(currentField.trim());
  if (currentRow.some((f) => f.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}
