const XLSX = require("xlsx");
const ExcelData = require("../models/ExcelData");

exports.uploadAndParseExcel = async (req, res) => {
  try {
    const file = req.file;

    if (!file) return res.status(400).json({ msg: "No file uploaded" });

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const saved = await ExcelData.create({
      filename: file.filename,
      data: jsonData,
      userId: req.user,
    });

    res.status(201).json({
      msg: "File uploaded and data stored",
      sample: jsonData.slice(0, 5),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
