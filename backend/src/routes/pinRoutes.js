const express = require("express");
const router = express.Router();
const pinController = require("../controllers/pinController");
const protect = require("../middleware/auth");
const { validatePin } = require("../middleware/validator");

router.get("/", pinController.getPins);
router.post("/", protect, validatePin, pinController.createPin);

module.exports = router;
