// Column helpers (used by the legacy migration; the live app infers types in the browser).
const toNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[$€£₹¥,\s%]/g, "");
  if (!/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
};
function inferType(values, name = "") {
  const present = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (!present.length) return "text";
  const nums = present.filter((v) => toNumber(v) !== null);
  if (nums.length / present.length >= 0.9) {
    const unique = new Set(nums.map(toNumber)).size;
    if (/(^|[\s_-])id$|^id$/i.test(name) && unique === nums.length) return "id";
    return "number";
  }
  const lower = present.map((v) => String(v).toLowerCase());
  if (lower.every((v) => ["true", "false", "yes", "no"].includes(v))) return "boolean";
  const dates = present.filter((v) => /^\d{4}-\d{2}-\d{2}/.test(String(v)) && !Number.isNaN(Date.parse(String(v))));
  if (dates.length / present.length >= 0.9) return "date";
  const unique = new Set(present.map(String)).size;
  return unique <= 30 || unique / present.length < 0.5 ? "category" : "text";
}
module.exports = { toNumber, inferType };
