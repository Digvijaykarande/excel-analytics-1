const express = require("express");
const router = express.Router();
const ExcelData=require("../models/ExcelData");
const upload = require("../middlewares/upload");
const { uploadAndParseExcel } = require("../controllers/excelController");
const auth = require("../middlewares/authMiddleware");

router.post("/upload", auth, upload.single("file"), uploadAndParseExcel);

router.get("/files", auth, async (req, res) => {
  try {
    
    const files = await ExcelData.find({ userId: req.user });

    // If you're showing all files (admin view or no user tracking)
   // const files = await ExcelData.find().sort({ createdAt: -1 }).limit(10);

    res.status(200).json(files);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
