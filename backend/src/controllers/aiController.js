const Anthropic = require("@anthropic-ai/sdk");
const db = require("../config/db");

const client = new Anthropic();

const formatDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

exports.generateTripSummary = async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;

  try {
    const memberCheck = await db.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    if (!memberCheck.rows.length)
      return res.status(403).json({ success: false, error: "그룹 멤버만 요약을 생성할 수 있습니다." });

    const groupResult = await db.query("SELECT name, description FROM groups WHERE id = $1", [groupId]);
    if (!groupResult.rows.length)
      return res.status(404).json({ success: false, error: "그룹을 찾을 수 없습니다." });
    const group = groupResult.rows[0];

    const { rows: pins } = await db.query(
      `SELECT p.id, p.title, p.lat, p.lng
       FROM pins p
       WHERE p.group_id = $1
       ORDER BY p.created_at ASC`,
      [groupId]
    );

    if (pins.length === 0)
      return res.status(400).json({ success: false, error: "핀이 없어서 요약을 생성할 수 없습니다." });

    for (const pin of pins) {
      const { rows: posts } = await db.query(
        `SELECT po.title, po.content, po.visited_from, po.visited_to, u.handle
         FROM posts po
         JOIN users u ON u.id = po.user_id
         WHERE po.pin_id = $1
         ORDER BY po.created_at ASC`,
        [pin.id]
      );
      pin.posts = posts;
    }

    const tripData = pins
      .map((pin) => {
        let text = `📍 ${pin.title} (${Number(pin.lat).toFixed(4)}, ${Number(pin.lng).toFixed(4)})`;
        if (pin.posts.length > 0) {
          pin.posts.forEach((post) => {
            const from = formatDate(post.visited_from);
            const to = formatDate(post.visited_to);
            const dateRange = from
              ? to && from !== to
                ? `${from} ~ ${to}`
                : from
              : null;
            text += `\n  - @${post.handle}`;
            if (dateRange) text += ` [${dateRange}]`;
            if (post.title) text += `: ${post.title}`;
            if (post.content) text += `\n    "${post.content}"`;
          });
        }
        return text;
      })
      .join("\n\n");

    const prompt = `다음은 "${group.name}" 그룹의 여행 기록입니다:\n\n${tripData}\n\n위 여행 기록을 바탕으로 자연스럽고 감성적인 한국어 여행 요약을 작성해주세요. 방문한 장소들의 분위기, 여행의 흐름, 멤버들의 경험을 녹여 마치 여행기처럼 써주세요. 이모지를 적절히 사용하고, 3-5문단으로 구성해주세요.`;

    const stream = await client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const message = await stream.finalMessage();
    const summaryBlock = message.content.find((b) => b.type === "text");
    const summary = summaryBlock?.text || "요약 생성에 실패했습니다.";

    res.json({ success: true, summary });
  } catch (err) {
    console.error("[GENERATE_SUMMARY_ERROR]", err);
    res.status(500).json({ success: false, error: "AI 요약 생성에 실패했습니다." });
  }
};
