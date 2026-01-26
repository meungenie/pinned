// backend/src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateSignup } = require("../middleware/validator");

/**
 * @route   POST /api/auth/signup
 * @desc    회원가입 및 유저 생성
 * @access  Public
 */
router.post("/signup", validateSignup, authController.signup);

module.exports = router;
