const mongoose = require("mongoose");

const excelDataSchema = new mongoose.Schema({
  filename: String,
  data: [
    {
      type: mongoose.Schema.Types.Mixed
    }
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model("ExcelData", excelDataSchema);
