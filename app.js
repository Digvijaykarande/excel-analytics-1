const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const env = require("./config/env");
const { auth } = require("./middlewares/auth");
const { notFound, errorHandler } = require("./middlewares/error");

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin(origin, cb) {
    if (!origin || env.clientOrigins().includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));

// Datasets carry parsed rows -> bigger body limit, but only AFTER authentication.
app.use("/api/datasets", auth, express.json({ limit: "30mb" }), require("./routes/datasetRoutes"));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/excel", require("./routes/excelRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));

app.use(express.static(path.join(__dirname, "public")));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
