const User = require("../models/User");
const Dataset = require("../models/Dataset");
const SheetData = require("../models/SheetData");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.stats = async (req, res) => {
  const since = new Date(Date.now() - 13 * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const [users, datasets, totals, newUsers, perDay, topUsers] = await Promise.all([
    User.countDocuments(),
    Dataset.countDocuments(),
    Dataset.aggregate([{ $group: { _id: null, rows: { $sum: "$totalRows" }, bytes: { $sum: "$sizeBytes" } } }]),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
    Dataset.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Dataset.aggregate([
      { $group: { _id: "$user", datasets: { $sum: 1 }, rows: { $sum: "$totalRows" } } },
      { $sort: { datasets: -1 } }, { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
      { $project: { datasets: 1, rows: 1, name: { $arrayElemAt: ["$u.name", 0] }, email: { $arrayElemAt: ["$u.email", 0] } } },
    ]),
  ]);
  const map = new Map(perDay.map((d) => [d._id, d.count]));
  const uploadsPerDay = Array.from({ length: 14 }, (_, i) => {
    const key = new Date(since.getTime() + i * 864e5).toISOString().slice(0, 10);
    return { date: key, count: map.get(key) || 0 };
  });
  res.json({ users, datasets, rows: totals[0]?.rows || 0, bytes: totals[0]?.bytes || 0, newUsers, uploadsPerDay, topUsers });
};

exports.listUsers = async (req, res) => {
  const { search = "", sort = "newest" } = req.query;
  const filter = {};
  if (search) { const rx = new RegExp(escapeRegex(String(search).slice(0, 80)), "i"); filter.$or = [{ name: rx }, { email: rx }]; }
  const sorts = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 }, email: { email: 1 } };
  const users = await User.find(filter).sort(sorts[sort] || sorts.newest).limit(500).lean();
  const counts = await Dataset.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) } } },
    { $group: { _id: "$user", datasets: { $sum: 1 }, rows: { $sum: "$totalRows" } } },
  ]);
  const by = new Map(counts.map((c) => [String(c._id), c]));
  res.json(users.map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, datasets: by.get(String(u._id))?.datasets || 0, rows: by.get(String(u._id))?.rows || 0 })));
};

exports.setRole = async (req, res) => {
  if (!["user", "admin"].includes(req.body.role)) return res.status(400).json({ msg: "Invalid role" });
  if (req.params.id === req.userId) return res.status(400).json({ msg: "You cannot change your own role" });
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!user) return res.status(404).json({ msg: "User not found" });
  res.json({ _id: user._id, role: user.role });
};

exports.deleteUser = async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ msg: "You cannot delete your own account here" });
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ msg: "User not found" });
  const ids = (await Dataset.find({ user: user._id }).select("_id")).map((d) => d._id);
  await SheetData.deleteMany({ dataset: { $in: ids } });
  await Dataset.deleteMany({ user: user._id });
  res.json({ msg: "User and their datasets deleted" });
};

// Metadata only: admins manage files but never read another user's rows.
exports.listDatasets = async (req, res) => {
  const filter = req.query.search ? { name: new RegExp(escapeRegex(String(req.query.search).slice(0, 80)), "i") } : {};
  res.json(await Dataset.find(filter).select("-insights").sort({ createdAt: -1 }).limit(300).populate("user", "name email").lean());
};
exports.deleteDataset = async (req, res) => {
  const ds = await Dataset.findByIdAndDelete(req.params.id);
  if (!ds) return res.status(404).json({ msg: "Dataset not found" });
  await SheetData.deleteMany({ dataset: ds._id });
  res.json({ msg: "Dataset deleted" });
};
