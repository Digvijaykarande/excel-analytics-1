const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/isAdmin");
const User = require("../models/User");

// Get all users - admin only
router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});


router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;

