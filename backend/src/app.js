const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const pinRoutes = require("./routes/pinRoutes");
const groupRoutes = require("./routes/groupRoutes");
const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// 보안 미들웨어 설정
app.use(helmet());
app.use(cors({ origin: "http://localhost:3000" })); // 프론트 주소만 허용
app.use(express.json());

// 헬스체크 (쿠버네티스 liveness/readiness probe)
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 라우팅
app.use("/api/auth", authRoutes);
app.use("/api/pins", pinRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/pins/:pinId/posts", postRoutes);
app.use("/api/posts/:postId/comments", commentRoutes);
app.use("/api/posts/:postId/photos", require("./routes/photoRoutes"));
app.use("/api/groups", aiRoutes);

// 404 처리
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

module.exports = app;
