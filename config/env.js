require("dotenv").config();
const required = ["MONGO_URI", "JWT_SECRET"];
function validateEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) { console.error(`Missing required environment variables: ${missing.join(", ")}`); process.exit(1); }
  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be at least 32 characters in production."); process.exit(1);
  }
}
const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

// Default origins used when CLIENT_ORIGINS env var is not set.
// Always include the known production Netlify URL + local dev so the app
// works out-of-the-box even if Render's env dashboard is not configured.
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "https://excel-anlytics.netlify.app",
];

module.exports = {
  validateEnv,
  port: () => Number(process.env.PORT) || 8000,
  jwtExpiresIn: () => process.env.JWT_EXPIRES_IN || "7d",
  adminEmails: () => list(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()),
  clientOrigins: () => (list(process.env.CLIENT_ORIGINS).length ? list(process.env.CLIENT_ORIGINS) : DEFAULT_ORIGINS),
};
