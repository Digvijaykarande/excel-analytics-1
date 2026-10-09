const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const signToken = (user) => jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: env.jwtExpiresIn() });
const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });

async function applyAdminList(user) {
  if (user.role !== "admin" && env.adminEmails().includes(user.email)) { user.role = "admin"; await user.save(); }
}

exports.register = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 60) return res.status(400).json({ msg: "Name must be 2-60 characters" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ msg: "Enter a valid email address" });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ msg: "Password must be 8-128 characters" });
  if (await User.exists({ email })) return res.status(409).json({ msg: "An account with this email already exists" });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
  await applyAdminList(user);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
};

exports.login = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ msg: "Invalid email or password" });
  user.lastLoginAt = new Date();
  await user.save();
  await applyAdminList(user);
  res.json({ token: signToken(user), user: publicUser(user) });
};
exports.publicUser = publicUser;
