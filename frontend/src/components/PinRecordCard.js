// frontend/src/components/PinRecordCard.js
// 핀 클릭 시 뜨는 "서류철 탭" 기록 카드.
// 탭 = 게시글 1개 (라벨: @handle, 같은 사람이 여러 개면 날짜 추가)
// 카드 위에 걸친 프로필 핀 = 현재 탭 작성자
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPostComments, createComment } from "../api/postApi";
import { c, r, t } from "../theme";

const formatDateRange = (from, to) => {
  if (!from) return null;
  const f = from.slice(0, 10);
  const tt = to ? to.slice(0, 10) : null;
  if (!tt || f === tt) return f;
  return `${f} ~ ${tt}`;
};

const initialOf = (handle) => (handle || "?").charAt(0).toUpperCase();
const shortDate = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
};

const PinRecordCard = ({ pin, posts, loading, onAddRecord }) => {
  const [active, setActive] = useState(0);
  const prevLen = useRef(posts.length);

  // 기록이 추가되면 새 탭으로 자동 이동, 목록이 줄면 범위 보정
  useEffect(() => {
    if (posts.length > prevLen.current) setActive(posts.length - 1);
    prevLen.current = posts.length;
    if (active >= posts.length) setActive(Math.max(0, posts.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  const post = posts[active];

  // 댓글 (활성 탭 기준)
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    if (!post) return;
    setComments([]);
    setCommentText("");
    setCommentsLoading(true);
    fetchPostComments(post.id)
      .then(setComments)
      .catch(console.error)
      .finally(() => setCommentsLoading(false));
  }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || sending || !post) return;
    setSending(true);
    try {
      const newComment = await createComment(post.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      alert("댓글 등록에 실패했어요: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // 같은 핸들의 기록이 여러 개면 탭 라벨에 날짜 추가
  const handleCounts = posts.reduce((acc, p) => {
    acc[p.handle] = (acc[p.handle] || 0) + 1;
    return acc;
  }, {});
  const tabLabel = (p) =>
    handleCounts[p.handle] > 1
      ? `@${p.handle} · ${shortDate(p.created_at)}`
      : `@${p.handle}`;

  const visitRange = post
    ? formatDateRange(post.visited_from, post.visited_to)
    : null;
  const hasPhotos = post?.photos?.length > 0;

  return (
    <div style={s.wrapper} onClick={(e) => e.stopPropagation()}>
      {/* 카드 경계에 걸친 프로필 핀 (현재 탭 작성자) */}
      <AnimatePresence mode="wait">
        {post && (
          <motion.div
            key={post.id}
            style={s.pinWrap}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
          >
            <div style={s.pinFace}>
      {post.avatar_url ? (
        <img
          src={post.avatar_url}
          alt={post.handle}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
        />
      ) : (
        initialOf(post.handle)
      )}
    </div>
            <div style={s.pinTail} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 탭 열 */}
      {posts.length > 0 && (
        <div style={s.tabRow}>
          {posts.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActive(i)}
              style={{ ...s.tab, ...(i === active ? s.tabActive : s.tabIdle) }}
            >
              {tabLabel(p)}
            </button>
          ))}
        </div>
      )}

      {/* 카드 본체 */}
      <div
        style={{
          ...s.card,
          borderTopLeftRadius: posts.length > 0 ? 0 : `${r.card}px`,
        }}
      >
        {loading ? (
          <p style={s.dim}>불러오는 중...</p>
        ) : !post ? (
          <div style={s.emptyBox}>
            <p style={s.emptyTitle}>아직 기록이 없어요.</p>
            <p style={s.dim}>이 장소의 첫 기록을 남겨보세요.</p>
            <button style={s.addBtn} onClick={onAddRecord}>
              + 기록 남기기
            </button>
          </div>
        ) : (
          <>
            {/* 장소 라벨 */}
            <p style={s.placeRow}>
              <span style={s.placeDot} />
              {pin?.title}
              <span style={s.createdAt}>
                {new Date(post.created_at).toLocaleDateString("ko-KR")}
              </span>
            </p>

            {/* 사진 + 메타 */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                marginTop: "12px",
                alignItems: "flex-start",
              }}
            >
              {hasPhotos && (
                <div style={{ flex: 1.2, minWidth: 0 }}>
                  <div style={s.photoStrip}>
                    {post.photos.map((ph) => (
                      <img
                        key={ph.id}
                        src={ph.url}
                        alt=""
                        style={s.photo}
                        onClick={() => setLightboxSrc(ph.url)}
                      />
                    ))}
                  </div>
                  <p style={s.photoHint}>클릭하면 크게 볼 수 있어요</p>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {post.title && <h3 style={s.title}>{post.title}</h3>}
                {visitRange && <span style={s.visitBadge}>{visitRange}</span>}
              </div>
            </div>

            {/* 내용 */}
            {post.content && <p style={s.content}>{post.content}</p>}

            {/* 댓글 */}
            <div style={s.commentSection}>
              <p style={s.commentHeading}>댓글 {comments.length}</p>
              {commentsLoading ? (
                <p style={s.dim}>불러오는 중...</p>
              ) : comments.length === 0 ? (
                <p style={s.dim}>첫 댓글을 남겨보세요.</p>
              ) : (
                <div style={s.commentList}>
                  {comments.map((cm) => (
                    <div key={cm.id} style={s.commentItem}>
                      <span style={s.commentAvatar}>
                        {initialOf(cm.handle)}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={s.commentAuthor}>@{cm.handle}</span>
                        <p style={s.commentText}>{cm.content}</p>
                      </div>
                      <span style={s.commentDate}>
                        {new Date(cm.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleSendComment} style={s.commentForm}>
                <input
                  placeholder="댓글 달기..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={s.commentInput}
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || sending}
                  style={{
                    ...s.sendBtn,
                    opacity: !commentText.trim() || sending ? 0.4 : 1,
                  }}
                >
                  전송
                </button>
              </form>
            </div>

            {/* 푸터: 기록 추가 */}
            <div style={s.footer}>
              <button style={s.addBtn} onClick={onAddRecord}>
                + 기록 추가
              </button>
            </div>
          </>
        )}
      </div>

      {/* 사진 라이트박스 */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            style={s.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            onClick={() => setLightboxSrc(null)}
          >
            <img
              src={lightboxSrc}
              alt=""
              style={s.lightboxImg}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const s = {
  // 걸친 핀 때문에 wrapper에는 overflow hidden 금지
  wrapper: {
    width: "min(560px, 92vw)",
    position: "relative",
    paddingTop: "16px",
  },

  pinWrap: {
    position: "absolute",
    top: "-14px",
    right: "34px",
    zIndex: 3,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pointerEvents: "none",
  },
  pinFace: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: c.ink,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: 700,
    border: `3px solid ${c.pin}`,
    boxShadow: "0 3px 12px rgba(16,16,18,0.3)",
  },
  pinTail: {
    width: "9px",
    height: "9px",
    background: c.pin,
    transform: "rotate(45deg)",
    marginTop: "-6px",
    borderRadius: "1px",
  },

  tabRow: {
    display: "flex",
    gap: "4px",
    paddingLeft: "16px",
    paddingRight: "90px",
    position: "relative",
    zIndex: 2,
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  tab: {
    border: `1px solid ${c.hairline}`,
    borderBottom: "none",
    borderRadius: "12px 12px 0 0",
    padding: "9px 16px",
    fontSize: "13px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    letterSpacing: "-0.01em",
    flexShrink: 0,
  },
  tabActive: {
    background: c.surface,
    color: c.ink,
    fontWeight: 700,
    position: "relative",
    top: "1px",
    paddingBottom: "11px",
  },
  tabIdle: {
    background: "rgba(255,255,255,0.6)",
    color: c.gray,
    fontWeight: 500,
  },

  card: {
    background: c.surface,
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.card}px`,
    borderTopRightRadius: `${r.card}px`,
    padding: "20px 22px",
    position: "relative",
    zIndex: 1,
    maxHeight: "72vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(16,16,18,0.28)",
  },

  placeRow: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12px",
    color: c.gray,
  },
  placeDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: c.pin,
    flexShrink: 0,
  },
  createdAt: { marginLeft: "auto", fontSize: "11px", color: c.grayLight },

  photoStrip: {
    display: "flex",
    gap: "6px",
    overflowX: "auto",
    borderRadius: "14px",
  },
  photo: {
    height: "170px",
    width: "auto",
    borderRadius: "14px",
    objectFit: "cover",
    cursor: "pointer",
    flexShrink: 0,
  },
  photoHint: { margin: "6px 0 0", fontSize: "11px", color: c.grayLight },

  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: c.ink,
    letterSpacing: "-0.02em",
  },
  visitBadge: {
    display: "inline-block",
    marginTop: "10px",
    fontSize: "12px",
    color: c.gray,
    fontWeight: 500,
    background: c.bg,
    border: `1px solid ${c.hairline}`,
    padding: "3px 10px",
    borderRadius: `${r.pill}px`,
  },
  content: {
    margin: "14px 0 0",
    fontSize: "14px",
    color: c.ink,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    borderTop: `1px solid ${c.hairline}`,
    paddingTop: "14px",
  },

  commentSection: {
    borderTop: `1px solid ${c.hairline}`,
    marginTop: "14px",
    paddingTop: "12px",
  },
  commentHeading: {
    fontSize: "12px",
    fontWeight: 700,
    color: c.gray,
    margin: "0 0 10px",
  },
  commentList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "12px",
  },
  commentItem: { display: "flex", alignItems: "flex-start", gap: "8px" },
  commentAvatar: {
    width: "24px",
    height: "24px",
    background: c.bg,
    color: c.ink,
    border: `1px solid ${c.hairline}`,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
    flexShrink: 0,
    boxSizing: "border-box",
  },
  commentAuthor: { fontSize: "12px", fontWeight: 700, color: c.ink },
  commentText: {
    fontSize: "13px",
    color: c.gray,
    margin: "2px 0 0",
    lineHeight: 1.5,
  },
  commentDate: {
    fontSize: "10px",
    color: c.grayLight,
    flexShrink: 0,
    marginTop: "2px",
  },
  commentForm: { display: "flex", gap: "8px" },
  commentInput: {
    flex: 1,
    padding: "9px 14px",
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.pill}px`,
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    color: c.ink,
    background: c.surface,
  },
  sendBtn: {
    padding: "9px 16px",
    background: c.ink,
    color: c.bg,
    border: "none",
    borderRadius: `${r.pill}px`,
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
    flexShrink: 0,
    fontFamily: "inherit",
  },

  footer: { display: "flex", justifyContent: "center", marginTop: "16px" },
  addBtn: {
    padding: "10px 24px",
    background: c.ink,
    color: c.bg,
    border: "none",
    borderRadius: `${r.pill}px`,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    fontFamily: "inherit",
  },

  emptyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "28px 0",
  },
  emptyTitle: { margin: 0, fontSize: "15px", fontWeight: 700, color: c.ink },
  dim: { margin: 0, fontSize: "13px", color: c.grayLight },

  lightbox: {
    position: "fixed",
    inset: 0,
    background: "rgba(16,16,18,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  lightboxImg: {
    maxWidth: "90vw",
    maxHeight: "90vh",
    borderRadius: "10px",
    objectFit: "contain",
  },
};

export default PinRecordCard;
