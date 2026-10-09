const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", UserSchema);
