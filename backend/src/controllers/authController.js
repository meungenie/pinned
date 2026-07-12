const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const storage = require("../config/gcs");

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, handle: user.handle, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

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
    res.status(201).json({ success: true, user, token: signToken(user) });
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
    res.json({ success: true, user: safeUser, token: signToken(safeUser) });
  } catch (err) {
    console.error("[LOGIN_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
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
      public: true,
    });
    const url = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;
    await db.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [url, userId]);
    res.json({ success: true, avatar_url: url });
  } catch (err) {
    console.error("[UPLOAD_AVATAR_ERROR]", err);
    res.status(500).json({ success: false, error: "아바타 업로드에 실패했습니다." });
  }
};
