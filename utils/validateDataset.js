// Validates + sanitises a dataset payload. The browser parses the spreadsheet (SheetJS) and sends
// { name, sheets:[{ name, columns:[{name,type}], rows:[[...]] }] }; the server never parses user binaries.
const TYPES = new Set(["number", "category", "text", "date", "boolean", "id"]);
const LIMITS = { sheets: 20, columns: 300, rowsTotal: 50000, cellsTotal: 1_000_000, cellChars: 2000 };

class ValidationError extends Error {
  constructor(message) { super(message); this.status = 400; }
}
function cleanCell(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v;
  const s = String(v);
  return s.length > LIMITS.cellChars ? s.slice(0, LIMITS.cellChars) : s;
}
function validateDataset(body) {
  if (!body || typeof body !== "object") throw new ValidationError("Invalid request body");
  const { name, originalName, sizeBytes, sheets } = body;
  const cleanName = String(name || originalName || "").trim().slice(0, 120);
  if (!cleanName) throw new ValidationError("A dataset name is required");
  if (!Array.isArray(sheets) || sheets.length === 0) throw new ValidationError("At least one sheet is required");
  if (sheets.length > LIMITS.sheets) throw new ValidationError(`Maximum ${LIMITS.sheets} sheets allowed`);
  let rowsTotal = 0, cellsTotal = 0;
  const outSheets = sheets.map((sheet, si) => {
    if (!sheet || !Array.isArray(sheet.columns) || !Array.isArray(sheet.rows)) throw new ValidationError(`Sheet ${si + 1} is malformed`);
    if (sheet.columns.length === 0) throw new ValidationError(`Sheet "${sheet.name || si + 1}" has no columns`);
    if (sheet.columns.length > LIMITS.columns) throw new ValidationError(`Maximum ${LIMITS.columns} columns per sheet`);
    const columns = sheet.columns.map((c, ci) => ({
      name: String(c?.name ?? `Column ${ci + 1}`).trim().slice(0, 200) || `Column ${ci + 1}`,
      type: TYPES.has(c?.type) ? c.type : "text",
    }));
    const width = columns.length;
    const rows = sheet.rows.map((r) => {
      if (!Array.isArray(r)) throw new ValidationError(`Sheet "${sheet.name}" contains an invalid row`);
      const out = new Array(width);
      for (let i = 0; i < width; i++) out[i] = cleanCell(r[i]);
      return out;
    });
    rowsTotal += rows.length;
    cellsTotal += rows.length * width;
    if (rowsTotal > LIMITS.rowsTotal) throw new ValidationError(`Maximum ${LIMITS.rowsTotal.toLocaleString()} rows allowed per file`);
    if (cellsTotal > LIMITS.cellsTotal) throw new ValidationError("File is too large (too many cells)");
    return { name: String(sheet.name || `Sheet${si + 1}`).slice(0, 100), columns, rows };
  });
  return {
    name: cleanName,
    originalName: String(originalName || "").slice(0, 200),
    sizeBytes: Number.isFinite(sizeBytes) ? Math.max(0, Math.floor(sizeBytes)) : 0,
    sheets: outSheets,
    totalRows: rowsTotal,
    totalColumns: outSheets.reduce((n, s) => n + s.columns.length, 0),
  };
}
module.exports = { validateDataset, ValidationError, LIMITS };
