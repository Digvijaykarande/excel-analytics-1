const mongoose = require("mongoose");
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validateId = (param = "id") => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) return res.status(400).json({ msg: "Invalid id" });
  next();
};
const notFound = (req, res) => res.status(404).json({ msg: `Route not found: ${req.method} ${req.originalUrl}` });
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (/^Origin .* not allowed by CORS/.test(err.message || "")) return res.status(403).json({ msg: err.message });
  if (err.type === "entity.too.large") return res.status(413).json({ msg: "Payload too large" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ msg: "Invalid JSON body" });
  if (err.code === 10334 || /BSONObj size|document is larger/i.test(err.message || "")) {
    return res.status(413).json({ msg: "This sheet is too large to store. Try removing columns or splitting the file." });
  }
  if (err.code === 11000) return res.status(409).json({ msg: "Already exists" });
  if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ msg: Object.values(err.errors)[0]?.message || "Validation failed" });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ msg: err.status ? err.message : "Server error" });
};
module.exports = { asyncHandler, validateId, notFound, errorHandler };
