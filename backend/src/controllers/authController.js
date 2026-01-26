const bcrypt = require("bcrypt");
const db = require("../config/db");

exports.signup = async (req, res) => {
  const { handle, username, email, password } = req.body;

  try {
    // 1. 비밀번호 암호화 (보안 강화)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 2. DB 저장 (SQL Injection 방지를 위한 파라미터 쿼리)
    const query = `
      INSERT INTO users (handle, username, email, password_hash) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, handle, email, created_at
    `;
    const values = [handle, username, email, password_hash];

    const { rows } = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: "pinned. 에 오신 것을 환영합니다.",
      user: rows[0],
    });
  } catch (err) {
    // 3. PostgreSQL 고유 에러 코드 대응
    if (err.code === "23505") {
      const field = err.detail.includes("handle") ? "핸들" : "이메일";
      return res
        .status(409)
        .json({ success: false, error: `이미 사용 중인 ${field}입니다.` });
    }
    console.error("[SIGNUP_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};
