const mongoose = require("mongoose");
// Rows are arrays aligned with the sheet's columns: ~3x smaller than objects, and headers
// containing "." or "$" can never break MongoDB.
const sheetDataSchema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: "Dataset", required: true, index: true },
  index: { type: Number, required: true },
  rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
});
sheetDataSchema.index({ dataset: 1, index: 1 }, { unique: true });
module.exports = mongoose.model("SheetData", sheetDataSchema);
