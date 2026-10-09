const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { register, login } = require("../controllers/authController");
const { asyncHandler } = require("../middlewares/error");
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { msg: "Too many attempts. Please try again in a few minutes." } });
router.post("/register", limiter, asyncHandler(register));
router.post("/login", limiter, asyncHandler(login));
module.exports = router;
