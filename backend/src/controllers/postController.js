const db = require("../config/db");
const storage = require("../config/gcs");

exports.getPinPosts = async (req, res) => {
  const { pinId } = req.params;
  try {
    const { rows: posts } = await db.query(
      `SELECT p.*, u.handle, u.username, u.avatar_url
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.pin_id = $1
       ORDER BY p.created_at ASC`,
      [pinId]
    );

    for (const post of posts) {
      const { rows: photos } = await db.query(
        "SELECT id, url, order_index FROM post_photos WHERE post_id = $1 ORDER BY order_index ASC",
        [post.id]
      );
      post.photos = photos;
    }

    res.json({ success: true, posts });
  } catch (err) {
    console.error("[GET_PIN_POSTS_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.createPost = async (req, res) => {
  const userId = req.user.id;
  const { pinId } = req.params;
  const { title, content, visited_from, visited_to } = req.body;

  try {
    const memberCheck = await db.query(
      `SELECT 1 FROM group_members gm
       JOIN pins p ON p.group_id = gm.group_id
       WHERE p.id = $1 AND gm.user_id = $2`,
      [pinId, userId]
    );
    if (!memberCheck.rows.length) {
      return res.status(403).json({ success: false, error: "그룹 멤버만 게시글을 작성할 수 있습니다." });
    }

    const { rows } = await db.query(
      `INSERT INTO posts (pin_id, user_id, title, content, visited_from, visited_to)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [pinId, userId, title || null, content || null, visited_from || null, visited_to || null]
    );
    res.status(201).json({ success: true, post: { ...rows[0], photos: [] } });
  } catch (err) {
    console.error("[CREATE_POST_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.addPhoto = async (req, res) => {
  const userId = req.user.id;
  const { postId } = req.params;
  const order_index = parseInt(req.body.order_index ?? 0, 10);

  if (!req.file) return res.status(400).json({ success: false, error: "파일이 없습니다." });

  try {
    const postCheck = await db.query(
      "SELECT 1 FROM posts WHERE id = $1 AND user_id = $2",
      [postId, userId]
    );
    if (!postCheck.rows.length) {
      return res.status(403).json({ success: false, error: "게시글 작성자만 사진을 추가할 수 있습니다." });
    }

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const ext = req.file.originalname.split(".").pop() || "jpg";
    const filename = `posts/${postId}/${Date.now()}_${order_index}.${ext}`;
    const gcsFile = bucket.file(filename);

    await gcsFile.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
      public: true,
    });

    const url = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;

    const { rows } = await db.query(
      "INSERT INTO post_photos (post_id, url, order_index) VALUES ($1, $2, $3) RETURNING *",
      [postId, url, order_index]
    );
    res.status(201).json({ success: true, photo: rows[0] });
  } catch (err) {
    console.error("[ADD_PHOTO_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.getPostComments = async (req, res) => {
  const { postId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.handle, u.username
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.json({ success: true, comments: rows });
  } catch (err) {
    console.error("[GET_COMMENTS_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};

exports.createComment = async (req, res) => {
  const userId = req.user.id;
  const { postId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ success: false, error: "댓글 내용은 필수입니다." });
  }

  try {
    const memberCheck = await db.query(
      `SELECT 1 FROM group_members gm
       JOIN pins p ON p.group_id = gm.group_id
       JOIN posts po ON po.pin_id = p.id
       WHERE po.id = $1 AND gm.user_id = $2`,
      [postId, userId]
    );
    if (!memberCheck.rows.length) {
      return res.status(403).json({ success: false, error: "그룹 멤버만 댓글을 작성할 수 있습니다." });
    }

    const { rows } = await db.query(
      "INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *",
      [postId, userId, content.trim()]
    );

    const userInfo = await db.query("SELECT handle, username FROM users WHERE id = $1", [userId]);
    const comment = { ...rows[0], ...userInfo.rows[0] };
    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("[CREATE_COMMENT_ERROR]", err);
    res.status(500).json({ success: false, error: "서버 내부 에러가 발생했습니다." });
  }
};
