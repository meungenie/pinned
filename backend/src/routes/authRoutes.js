const express = require("express");
const multer = require("multer");
const router = express.Router();
const authController = require("../controllers/authController");
const protect = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("이미지 파일만 업로드할 수 있습니다."));
  },
});

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", protect, authController.getMe);
router.post("/avatar", protect, upload.single("avatar"), authController.uploadAvatar);

module.exports = router;
