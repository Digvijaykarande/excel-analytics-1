const mongoose = require("mongoose");
const XLSX = require("xlsx");
const Dataset = require("../models/Dataset");
const SheetData = require("../models/SheetData");
const { validateDataset } = require("../utils/validateDataset");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 }, largest: { totalRows: -1 } };

exports.create = async (req, res) => {
  const data = validateDataset(req.body);
  const dataset = await Dataset.create({
    user: req.userId, name: data.name, originalName: data.originalName, sizeBytes: data.sizeBytes,
    totalRows: data.totalRows, totalColumns: data.totalColumns,
    sheets: data.sheets.map((s) => ({ name: s.name, columns: s.columns, rowCount: s.rows.length })),
  });
  try {
    await SheetData.insertMany(data.sheets.map((s, index) => ({ dataset: dataset._id, index, rows: s.rows })));
  } catch (err) {
    await Dataset.deleteOne({ _id: dataset._id }); // never leave a half-saved dataset
    throw err;
  }
  res.status(201).json(dataset);
};

exports.list = async (req, res) => {
  const { search = "", sort = "newest", starred } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const filter = { user: req.userId };
  if (search) filter.name = new RegExp(escapeRegex(String(search).slice(0, 80)), "i");
  if (starred === "true") filter.starred = true;
  const [items, total] = await Promise.all([
    Dataset.find(filter).select("-insights").sort(SORTS[sort] || SORTS.newest).skip((page - 1) * limit).limit(limit),
    Dataset.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};

exports.stats = async (req, res) => {
  const [agg] = await Dataset.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
    { $group: { _id: null, datasets: { $sum: 1 }, rows: { $sum: "$totalRows" }, bytes: { $sum: "$sizeBytes" }, starred: { $sum: { $cond: ["$starred", 1, 0] } } } },
  ]);
  const recent = await Dataset.find({ user: req.userId }).select("-insights").sort({ createdAt: -1 }).limit(5);
  res.json({ datasets: agg?.datasets || 0, rows: agg?.rows || 0, bytes: agg?.bytes || 0, starred: agg?.starred || 0, recent });
};

exports.get = async (req, res) => {
  const dataset = await Dataset.findOne({ _id: req.params.id, user: req.userId });
  if (!dataset) return res.status(404).json({ msg: "Dataset not found" });
  res.json(dataset);
};

exports.getSheet = async (req, res) => {
  const index = parseInt(req.params.index, 10);
  const dataset = await Dataset.findOne({ _id: req.params.id, user: req.userId });
  if (!dataset) return res.status(404).json({ msg: "Dataset not found" });
  const meta = dataset.sheets[index];
  if (!meta) return res.status(404).json({ msg: "Sheet not found" });
  const sheet = await SheetData.findOne({ dataset: dataset._id, index }).lean();
  res.json({ name: meta.name, columns: meta.columns, rows: sheet?.rows || [] });
};

exports.update = async (req, res) => {
  const patch = {};
  if (typeof req.body.name === "string") {
    const name = req.body.name.trim().slice(0, 120);
    if (!name) return res.status(400).json({ msg: "Name cannot be empty" });
    patch.name = name;
  }
  if (typeof req.body.starred === "boolean") patch.starred = req.body.starred;
  if (!Object.keys(patch).length) return res.status(400).json({ msg: "Nothing to update" });
  const dataset = await Dataset.findOneAndUpdate({ _id: req.params.id, user: req.userId }, patch, { new: true }).select("-insights");
  if (!dataset) return res.status(404).json({ msg: "Dataset not found" });
  res.json(dataset);
};

exports.saveInsights = async (req, res) => {
  const insights = req.body?.insights;
  if (!insights || typeof insights !== "object" || JSON.stringify(insights).length > 50000) return res.status(400).json({ msg: "Invalid insights payload" });
  const dataset = await Dataset.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { insights: { ...insights, savedAt: new Date() } });
  if (!dataset) return res.status(404).json({ msg: "Dataset not found" });
  res.json({ ok: true });
};

exports.remove = async (req, res) => {
  const dataset = await Dataset.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!dataset) return res.status(404).json({ msg: "Dataset not found" });
  await SheetData.deleteMany({ dataset: dataset._id });
  res.json({ msg: "Dataset deleted" });
};

exports.download = async (req, res) => {
  const format = req.query.format === "csv" ? "csv" : "xlsx";
  const dataset = await Dataset.findOne({ _id: req.params.id, user: req.userId });
  if (!dataset) return res.status(404).json({ msg: "Dataset not found" });
  const sheets = await SheetData.find({ dataset: dataset._id }).sort({ index: 1 }).lean();
  const toAoa = (i) => [dataset.sheets[i].columns.map((c) => c.name), ...(sheets.find((s) => s.index === i)?.rows || [])];
  const base = dataset.name.replace(/[^\w\-. ]+/g, "_").replace(/\.(xlsx?|csv)$/i, "") || "dataset";
  if (format === "csv") {
    const i = Math.min(Math.max(parseInt(req.query.sheet, 10) || 0, 0), dataset.sheets.length - 1);
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(toAoa(i)));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${base}.csv"`);
    return res.send("﻿" + csv);
  }
  const wb = XLSX.utils.book_new();
  dataset.sheets.forEach((meta, i) => {
    const safe = meta.name.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || `Sheet${i + 1}`;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toAoa(i)), safe);
  });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${base}.xlsx"`);
  res.send(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
};
