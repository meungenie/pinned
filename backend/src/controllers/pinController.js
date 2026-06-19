const db = require("../config/db");

exports.getPins = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM pins ORDER BY created_at DESC");
    res.status(200).json({ success: true, pins: rows });
  } catch (err) {
    console.error("[GET_PINS_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.createPin = async (req, res) => {
  const userId = req.user.id;
  const { lat, lng, title } = req.body;

  if (!lat || !lng || !title) {
    return res.status(400).json({ success: false, error: "lat, lng, title은 필수입니다." });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO pins (user_id, lat, lng, title)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, lat, lng, title, created_at`,
      [userId, lat, lng, title]
    );
    res.status(201).json({ success: true, pin: rows[0] });
  } catch (err) {
    console.error("[CREATE_PIN_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};
