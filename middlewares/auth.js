const jwt = require("jsonwebtoken");
const User = require("../models/User");

/** Verifies Bearer token AND that the user still exists. Sets req.userId / req.user. */
async function auth(req, res, next) {
  const header = req.header("Authorization") || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ msg: "Authentication required" });
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("name email role createdAt");
    if (!user) return res.status(401).json({ msg: "Account no longer exists", code: "TOKEN_INVALID" });
    req.userId = String(user._id);
    req.user = user;
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    res.status(401).json({ msg: expired ? "Session expired, please log in again" : "Invalid token", code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID" });
  }
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ msg: "Admins only" });
  next();
}
module.exports = { auth, requireAdmin };
