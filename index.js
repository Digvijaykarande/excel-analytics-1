const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 8000;

dotenv.config();

// Connect MongoDB
connectDB();

// Middlewares
app.use(cors()); //allowed access to all ( only for testing)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.get("/", (req, res) => {res.send("  Excel Analytics API Server is here!");});
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/excel", require("./routes/excelRoutes"));
app.use("/api/excel/files", require("./routes/excelRoutes"));


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
