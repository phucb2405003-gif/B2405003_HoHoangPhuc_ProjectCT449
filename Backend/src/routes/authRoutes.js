const express = require("express");
const authController = require("../controllers/authController");
const loginRateLimit = require("../middlewares/loginRateLimit");

const router = express.Router();

// Đăng nhập
router.post("/login", loginRateLimit, authController.login);

module.exports = router;
