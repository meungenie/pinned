const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");

const app = express();

// 보안 미들웨어 설정
app.use(helmet());
app.use(cors({ origin: "http://localhost:3000" })); // 프론트 주소만 허용
app.use(express.json());

// 라우팅
app.use("/api/auth", authRoutes);

// 404 처리
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

module.exports = app;
