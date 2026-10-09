const mongoose = require("mongoose");
// Dataset = lightweight metadata (lists stay fast). Row data lives in SheetData.
const columnSchema = new mongoose.Schema(
  { name: { type: String, required: true }, type: { type: String, enum: ["number", "category", "text", "date", "boolean", "id"], default: "text" } },
  { _id: false }
);
const sheetMetaSchema = new mongoose.Schema(
  { name: { type: String, required: true }, columns: [columnSchema], rowCount: { type: Number, default: 0 } },
  { _id: false }
);
const datasetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    originalName: { type: String, trim: true, maxlength: 200 },
    sizeBytes: { type: Number, default: 0 },
    sheets: [sheetMetaSchema],
    totalRows: { type: Number, default: 0 },
    totalColumns: { type: Number, default: 0 },
    starred: { type: Boolean, default: false },
    insights: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
datasetSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model("Dataset", datasetSchema);
