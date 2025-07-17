const express = require("express");
const router = express.Router();
const ExcelData = require("../models/ExcelData");
const XLSX = require("xlsx");

// DOWNLOAD Excel File by filename
router.get('/download/:filename', async (req, res) => {
  try {
    const file = await ExcelData.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const data = file.data.map(row => Object.fromEntries(row));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

// DELETE File by MongoDB _id
router.delete('/delete/:id', async (req, res) => {
  try {
    const deletedFile = await ExcelData.findByIdAndDelete(req.params.id);
    if (!deletedFile) {
      return res.status(404).json({ message: "File not found" });
    }

    res.status(200).json({ message: "File deleted successfully", file: deletedFile });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete file", error: error.message });
  }
});

module.exports = router;
