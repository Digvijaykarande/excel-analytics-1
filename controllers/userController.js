const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Dataset = require("../models/Dataset");
const SheetData = require("../models/SheetData");
const { publicUser } = require("./authController");

exports.me = async (req, res) => res.json(publicUser(req.user));
exports.updateMe = async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (name.length < 2 || name.length > 60) return res.status(400).json({ msg: "Name must be 2-60 characters" });
  req.user.name = name;
  await req.user.save();
  res.json(publicUser(req.user));
};
exports.changePassword = async (req, res) => {
  const { currentPassword = "", newPassword = "" } = req.body;
  if (String(newPassword).length < 8 || String(newPassword).length > 128) return res.status(400).json({ msg: "New password must be 8-128 characters" });
  const user = await User.findById(req.userId).select("+password");
  if (!(await bcrypt.compare(String(currentPassword), user.password))) return res.status(400).json({ msg: "Current password is incorrect" });
  user.password = await bcrypt.hash(String(newPassword), 12);
  await user.save();
  res.json({ msg: "Password updated" });
};
exports.deleteMe = async (req, res) => {
  const user = await User.findById(req.userId).select("+password");
  if (!(await bcrypt.compare(String(req.body.password || ""), user.password))) return res.status(400).json({ msg: "Password is incorrect" });
  const ids = (await Dataset.find({ user: req.userId }).select("_id")).map((d) => d._id);
  await SheetData.deleteMany({ dataset: { $in: ids } });
  await Dataset.deleteMany({ user: req.userId });
  await user.deleteOne();
  res.json({ msg: "Account deleted" });
};
