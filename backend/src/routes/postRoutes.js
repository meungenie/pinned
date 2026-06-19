const express = require("express");
const router = express.Router({ mergeParams: true });
const protect = require("../middleware/auth");
const postController = require("../controllers/postController");

// /api/pins/:pinId/posts
router.get("/", protect, postController.getPinPosts);
router.post("/", protect, postController.createPost);

module.exports = router;
