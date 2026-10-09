/**
 * One-off migration: old `ExcelData` docs (Map<String,String> rows) -> Dataset + SheetData (typed, array rows).
 *   npm run migrate:legacy            dry run
 *   npm run migrate:legacy -- --apply writes
 * The legacy collection is left untouched.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Dataset = require("../models/Dataset");
const SheetData = require("../models/SheetData");
const { inferType, toNumber } = require("../utils/columns");
const apply = process.argv.includes("--apply");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const cursor = mongoose.connection.collection("exceldatas").find({});
  let migrated = 0, skipped = 0;
  for await (const doc of cursor) {
    const rowsIn = Array.isArray(doc.data) ? doc.data : [];
    if (!rowsIn.length) { skipped++; continue; }
    if (await Dataset.exists({ user: doc.userId, name: doc.filename, createdAt: doc.uploadedAt })) { skipped++; continue; }
    const names = [...new Set(rowsIn.flatMap((r) => Object.keys(r || {})))];
    const cols = names.map((name) => ({ name, type: inferType(rowsIn.map((r) => r?.[name] ?? null), name) }));
    const rows = rowsIn.map((r) => cols.map((c) => {
      const v = r?.[c.name];
      if (v === undefined || v === null || v === "") return null;
      return c.type === "number" || c.type === "id" ? toNumber(v) : String(v);
    }));
    console.log(`${apply ? "Migrating" : "Would migrate"}: ${doc.filename} (${rows.length} rows, ${cols.length} cols)`);
    if (apply) {
      const ds = await Dataset.create({ user: doc.userId, name: doc.filename, originalName: doc.filename, totalRows: rows.length, totalColumns: cols.length, createdAt: doc.uploadedAt, sheets: [{ name: "Sheet1", columns: cols, rowCount: rows.length }] });
      await SheetData.create({ dataset: ds._id, index: 0, rows });
    }
    migrated++;
  }
  console.log(`${apply ? "Migrated" : "Would migrate"} ${migrated}, skipped ${skipped}.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
