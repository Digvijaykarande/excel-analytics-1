const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const rateLimit = require("express-rate-limit");
const path = require("path"); 
const app = express();
dotenv.config();

connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); 

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://excel-anlytics.netlify.app',
    'https://excel-analytics-git-main-digvijaykarandes-projects.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.options('*', cors());


const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 50,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Core Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/excel", require("./routes/excelRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
