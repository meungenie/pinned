const express = require("express");
const multer = require("multer");
const router = express.Router({ mergeParams: true });
const protect = require("../middleware/auth");
const postController = require("../controllers/postController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("이미지 파일만 업로드할 수 있습니다."));
  },
});

// POST /api/posts/:postId/photos
router.post("/", protect, upload.single("photo"), postController.addPhoto);

module.exports = router;
