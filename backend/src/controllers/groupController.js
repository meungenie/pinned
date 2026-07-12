const crypto = require("crypto");
const db = require("../config/db");

const generateInviteCode = () =>
  crypto.randomBytes(6).toString("base64url").substring(0, 8);

exports.createGroup = async (req, res) => {
  const userId = req.user.id;
  const { name, description, emoji } = req.body;
  if (!name)
    return res
      .status(400)
      .json({ success: false, error: "그룹 이름은 필수입니다." });

  try {
    const invite_code = generateInviteCode();
    const { rows } = await db.query(
      `INSERT INTO groups (name, description, emoji, created_by, invite_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || null, emoji || null, userId, invite_code],
    );
    const group = rows[0];
    await db.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')",
      [group.id, userId],
    );
    res.status(201).json({ success: true, group });
  } catch (err) {
    console.error("[CREATE_GROUP_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getMyGroups = async (req, res) => {
  const userId = req.user.id;
  try {
    // member_handles: 보드 카드의 멤버 미리보기용 (앞 4명)
    const { rows } = await db.query(
      `SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
        (SELECT COUNT(*) FROM pins WHERE group_id = g.id) AS pin_count,
        (SELECT COALESCE(json_agg(t.handle), '[]'::json)
         FROM (
           SELECT u.handle
           FROM group_members gm2
           JOIN users u ON u.id = gm2.user_id
           WHERE gm2.group_id = g.id
           ORDER BY gm2.joined_at
           LIMIT 4
         ) t) AS member_handles
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId],
    );
    res.json({ success: true, groups: rows });
  } catch (err) {
    console.error("[GET_MY_GROUPS_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getGroupByInviteCode = async (req, res) => {
  const { code } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT g.id, g.name, g.description, g.emoji,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM groups g WHERE g.invite_code = $1`,
      [code],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, error: "유효하지 않은 초대 코드입니다." });
    res.json({ success: true, group: rows[0] });
  } catch (err) {
    console.error("[GET_GROUP_BY_CODE_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.joinGroup = async (req, res) => {
  const userId = req.user.id;
  const { code } = req.params;
  try {
    const groupResult = await db.query(
      "SELECT id FROM groups WHERE invite_code = $1",
      [code],
    );
    if (!groupResult.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "유효하지 않은 초대 코드입니다." });
    const groupId = groupResult.rows[0].id;

    await db.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [groupId, userId],
    );
    res.json({
      success: true,
      message: "그룹에 가입되었습니다.",
      group_id: groupId,
    });
  } catch (err) {
    console.error("[JOIN_GROUP_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getGroupPins = async (req, res) => {
  const { groupId } = req.params;
  try {
    // creator_handle: 핀 마커 얼굴 (생성자 고정)
    // author_handles: 그 핀에 게시글 쓴 멤버들 (마커 스택용, distinct)
    const { rows } = await db.query(
      `SELECT p.*, u.handle, u.username,
        u.handle AS creator_handle,
        u.avatar_url AS creator_avatar_url,
        (SELECT COUNT(*) FROM posts WHERE pin_id = p.id) AS post_count,
        (SELECT COALESCE(json_agg(DISTINCT u2.handle), '[]'::json)
         FROM posts po
         JOIN users u2 ON u2.id = po.user_id
         WHERE po.pin_id = p.id) AS author_handles
       FROM pins p
       JOIN users u ON u.id = p.created_by
       WHERE p.group_id = $1
       ORDER BY p.created_at DESC`,
      [groupId],
    );
    res.json({ success: true, pins: rows });
  } catch (err) {
    console.error("[GET_GROUP_PINS_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
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
      [groupId, userId],
    );
    if (!rows.length)
      return res
        .status(403)
        .json({
          success: false,
          error: "그룹을 찾을 수 없거나 멤버가 아닙니다.",
        });
    res.json({ success: true, group: rows[0] });
  } catch (err) {
    console.error("[GET_GROUP_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.createGroupPin = async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  const { lat, lng, title } = req.body;

  if (!lat || !lng || !title) {
    return res
      .status(400)
      .json({ success: false, error: "lat, lng, title은 필수입니다." });
  }

  try {
    const memberCheck = await db.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId],
    );
    if (!memberCheck.rows.length)
      return res
        .status(403)
        .json({
          success: false,
          error: "그룹 멤버만 핀을 추가할 수 있습니다.",
        });

    const { rows } = await db.query(
      `INSERT INTO pins (group_id, user_id, created_by, lat, lng, title)
       VALUES ($1, $2, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, userId, lat, lng, title],
    );
    // 방금 만든 핀도 마커가 바로 그려지도록 생성자 정보 포함해서 반환
    // (avatar_url은 JWT에 없으므로 null — 업로드 기능 붙일 때 users 조회로 교체)
    const pin = {
      ...rows[0],
      creator_handle: req.user.handle,
      creator_avatar_url: null,
      author_handles: [],
    };
    res.status(201).json({ success: true, pin });
  } catch (err) {
    console.error("[CREATE_GROUP_PIN_ERROR]", err);
    res
      .status(500)
      .json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};
