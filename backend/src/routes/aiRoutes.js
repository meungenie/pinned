const express = require("express");
const router = express.Router({ mergeParams: true });
const protect = require("../middleware/auth");
const { generateTripSummary } = require("../controllers/aiController");

router.post("/:groupId/summary", protect, generateTripSummary);

module.exports = router;
