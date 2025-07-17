const express = require("express");
const router = express.Router();
const ExcelData = require("../models/ExcelData");
const upload = require("../middlewares/upload");
const { uploadAndParseExcel } = require("../controllers/excelController");
const auth = require("../middlewares/authMiddleware");
const fs = require("fs");
const path = require("path");

// Upload Excel file
router.post("/upload", auth, upload.single("file"), uploadAndParseExcel);

// Get list of uploaded files 
router.get("/files", auth, async (req, res) => {
  try {
    const files = await ExcelData.find({ userId: req.user });
    res.status(200).json(files);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Download specific file by ID
router.get("/download/:id", async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRecord = await ExcelData.findById(fileId);
    if (!fileRecord) return res.status(404).send("File not found");

    const filePath = path.join(__dirname, "..", "uploads", fileRecord.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send("File not found on server");

    res.download(filePath, fileRecord.filename);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("Server error while downloading file.");
  }
});

module.exports = router;
