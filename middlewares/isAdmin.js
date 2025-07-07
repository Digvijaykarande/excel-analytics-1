const User = require("../models/User");

//Middleware to check the user is admin or not
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user); 
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied. Admins only." });
    }

    next();
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = isAdmin;
