const mongoose = require("mongoose");
module.exports = async function connectDB() {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};
