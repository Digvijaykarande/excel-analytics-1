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

// Rate Limiter Middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Core Middlewares
app.use(cors()); // Enable for all origins (for production, restrict by origin)
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


// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
