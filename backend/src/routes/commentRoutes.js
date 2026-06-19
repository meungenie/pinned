const express = require("express");
const router = express.Router({ mergeParams: true });
const protect = require("../middleware/auth");
const postController = require("../controllers/postController");

// /api/posts/:postId/comments
router.get("/", protect, postController.getPostComments);
router.post("/", protect, postController.createComment);

module.exports = router;
