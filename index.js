const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();
const fs = require('fs');
const router = express.Router();
const PORT = process.env.PORT || 8000;

dotenv.config();
// Connect MongoDB
connectDB();

//rate limiter
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

app.use(limiter);

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

//download files 
router.get('/api/excel/download/:id', async (req, res) => {
  const fileId = req.params.id;
  const fileRecord = await FileModel.findById(fileId);
  if (!fileRecord) {
    return res.status(404).send('File not found');
  }
  const filePath = path.join(__dirname, '..', 'uploads', fileRecord.filename);
  res.download(filePath, fileRecord.filename);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
