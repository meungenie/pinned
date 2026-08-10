const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const storage = require("../config/gcs");

const REFRESH_TOKEN_EXPIRES_DAYS = 14;
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

const signAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, handle: user.handle, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

const issueRefreshToken = async (userId) => {
  const raw = crypto.randomBytes(64).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hash, expiresAt]
  );

  return raw;
};

exports.register = async (req, res) => {
  const { handle, username, email, password } = req.body;

  if (!handle || !username || !email || !password) {
    return res.status(400).json({ success: false, error: "모든 필드를 입력해주세요." });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: "비밀번호는 6자 이상이어야 합니다." });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (handle, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, handle, username, email, created_at`,
      [handle, username, email, hash]
    );
    const user = rows[0];
    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(201).json({ success: true, user, accessToken });
  } catch (err) {
    if (err.code === "23505") {
      const msg = err.constraint?.includes("email")
        ? "이미 사용 중인 이메일입니다."
        : "이미 사용 중인 핸들입니다.";
      return res.status(409).json({ success: false, error: msg });
    }
    console.error("[REGISTER_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "이메일과 비밀번호를 입력해주세요." });
  }

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const { password_hash, ...safeUser } = user;
    const accessToken = signAccessToken(safeUser);
    const refreshToken = await issueRefreshToken(user.id);

    res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ success: true, user: safeUser, accessToken });
  } catch (err) {
    console.error("[LOGIN_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.refresh = async (req, res) => {
  const raw = req.cookies?.refresh_token;
  if (!raw) {
    return res.status(401).json({ success: false, error: "Refresh token이 없습니다." });
  }

  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  try {
    const { rows } = await db.query(
      `SELECT rt.*, u.id as uid, u.email, u.handle, u.username, u.avatar_url
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [hash]
    );

    if (!rows.length) {
      res.clearCookie("refresh_token", { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
      return res.status(401).json({ success: false, error: "유효하지 않은 Refresh token입니다." });
    }

    const row = rows[0];

    // Refresh token rotation: 기존 삭제 후 새 토큰 발급
    await db.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [hash]);
    const newRefreshToken = await issueRefreshToken(row.uid);

    const user = {
      id: row.uid,
      email: row.email,
      handle: row.handle,
      username: row.username,
      avatar_url: row.avatar_url,
    };

    res.cookie("refresh_token", newRefreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ success: true, user, accessToken: signAccessToken(user) });
  } catch (err) {
    console.error("[REFRESH_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.logout = async (req, res) => {
  const raw = req.cookies?.refresh_token;

  if (raw) {
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    await db.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [hash]).catch(() => {});
  }

  res.clearCookie("refresh_token", { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
  res.json({ success: true });
};

exports.getMe = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, handle, username, email, avatar_url, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: "프로필을 찾을 수 없습니다." });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("[GET_ME_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.uploadAvatar = async (req, res) => {
  const userId = req.user.id;
  try {
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const ext = req.file.originalname.split(".").pop() || "jpg";
    const filename = `avatars/${userId}/${Date.now()}.${ext}`;
    const gcsFile = bucket.file(filename);

    await gcsFile.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    const url = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;
    await db.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [url, userId]);
    res.json({ success: true, avatar_url: url });
  } catch (err) {
    console.error("[UPLOAD_AVATAR_ERROR]", err);
    res.status(500).json({ success: false, error: "아바타 업로드에 실패했습니다." });
  }
};
