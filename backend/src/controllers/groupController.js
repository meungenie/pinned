const crypto = require("crypto");
const db = require("../config/db");

const generateInviteCode = () =>
  crypto.randomBytes(6).toString("base64url").substring(0, 8);

exports.createGroup = async (req, res) => {
  const userId = req.user.id;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "그룹 이름은 필수입니다." });

  try {
    const invite_code = generateInviteCode();
    const { rows } = await db.query(
      `INSERT INTO groups (name, description, created_by, invite_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, userId, invite_code]
    );
    const group = rows[0];
    await db.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')",
      [group.id, userId]
    );
    res.status(201).json({ success: true, group });
  } catch (err) {
    console.error("[CREATE_GROUP_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getMyGroups = async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
        (SELECT COUNT(*) FROM pins WHERE group_id = g.id) AS pin_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId]
    );
    res.json({ success: true, groups: rows });
  } catch (err) {
    console.error("[GET_MY_GROUPS_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getGroupByInviteCode = async (req, res) => {
  const { code } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT g.id, g.name, g.description,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM groups g WHERE g.invite_code = $1`,
      [code]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: "유효하지 않은 초대 코드입니다." });
    res.json({ success: true, group: rows[0] });
  } catch (err) {
    console.error("[GET_GROUP_BY_CODE_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.joinGroup = async (req, res) => {
  const userId = req.user.id;
  const { code } = req.params;
  try {
    const groupResult = await db.query("SELECT id FROM groups WHERE invite_code = $1", [code]);
    if (!groupResult.rows.length)
      return res.status(404).json({ success: false, error: "유효하지 않은 초대 코드입니다." });
    const groupId = groupResult.rows[0].id;

    await db.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [groupId, userId]
    );
    res.json({ success: true, message: "그룹에 가입되었습니다.", group_id: groupId });
  } catch (err) {
    console.error("[JOIN_GROUP_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getGroupPins = async (req, res) => {
  const { groupId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.handle, u.username,
        (SELECT COUNT(*) FROM posts WHERE pin_id = p.id) AS post_count
       FROM pins p
       JOIN users u ON u.id = p.created_by
       WHERE p.group_id = $1
       ORDER BY p.created_at DESC`,
      [groupId]
    );
    res.json({ success: true, pins: rows });
  } catch (err) {
    console.error("[GET_GROUP_PINS_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getGroup = async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2
       WHERE g.id = $1`,
      [groupId, userId]
    );
    if (!rows.length)
      return res.status(403).json({ success: false, error: "그룹을 찾을 수 없거나 멤버가 아닙니다." });
    res.json({ success: true, group: rows[0] });
  } catch (err) {
    console.error("[GET_GROUP_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.createGroupPin = async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  const { lat, lng, title } = req.body;

  if (!lat || !lng || !title) {
    return res.status(400).json({ success: false, error: "lat, lng, title은 필수입니다." });
  }

  try {
    const memberCheck = await db.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    if (!memberCheck.rows.length)
      return res.status(403).json({ success: false, error: "그룹 멤버만 핀을 추가할 수 있습니다." });

    const { rows } = await db.query(
      `INSERT INTO pins (group_id, user_id, created_by, lat, lng, title)
       VALUES ($1, $2, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, userId, lat, lng, title]
    );
    res.status(201).json({ success: true, pin: rows[0] });
  } catch (err) {
    console.error("[CREATE_GROUP_PIN_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};
