import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPostComments, createComment } from "../api/postApi";

const formatDateRange = (from, to) => {
  if (!from) return null;
  const f = from.slice(0, 10);
  const t = to ? to.slice(0, 10) : null;
  if (!t || f === t) return f;
  return `${f} ~ ${t}`;
};

const PostDetailModal = ({ post, pinTitle, onClose }) => {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const commentInputRef = useRef(null);

  useEffect(() => {
    fetchPostComments(post.id)
      .then(setComments)
      .catch(console.error)
      .finally(() => setCommentsLoading(false));
  }, [post.id]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || sending) return;
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

  const visitRange = formatDateRange(post.visited_from, post.visited_to);

  return (
    <div style={s.overlay} onClick={onClose}>
      <motion.div
        style={s.modal}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={s.header}>
          <div>
            <p style={s.pinLabel}>📍 {pinTitle}</p>
            <div style={s.authorRow}>
              <span style={s.avatar}>{(post.handle || "?")[0].toUpperCase()}</span>
              <span style={s.author}>@{post.handle}</span>
              <span style={s.date}>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {/* 방문 기간 */}
          {visitRange && (
            <span style={s.visitBadge}>📅 {visitRange}</span>
          )}

          {/* 제목 */}
          {post.title && <h3 style={s.title}>{post.title}</h3>}

          {/* 본문 */}
          {post.content && <p style={s.content}>{post.content}</p>}

          {/* 사진 갤러리 */}
          {post.photos?.length > 0 && (
            <div style={s.gallery}>
              {post.photos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt=""
                  style={s.galleryImg}
                  onClick={() => setLightboxSrc(photo.url)}
                />
              ))}
            </div>
          )}

          {/* 댓글 */}
          <div style={s.commentSection}>
            <p style={s.commentHeading}>댓글 {comments.length}개</p>

            {commentsLoading ? (
              <p style={s.dimText}>불러오는 중...</p>
            ) : comments.length === 0 ? (
              <p style={s.dimText}>첫 댓글을 남겨보세요!</p>
            ) : (
              <div style={s.commentList}>
                {comments.map((c) => (
                  <div key={c.id} style={s.commentItem}>
                    <span style={s.commentAvatar}>{(c.handle || "?")[0].toUpperCase()}</span>
                    <div style={s.commentBody}>
                      <span style={s.commentAuthor}>@{c.handle}</span>
                      <p style={s.commentText}>{c.content}</p>
                    </div>
                    <span style={s.commentDate}>
                      {new Date(c.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 댓글 입력 */}
            <form onSubmit={handleSendComment} style={s.commentForm}>
              <input
                ref={commentInputRef}
                placeholder="댓글 달기..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={s.commentInput}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || sending}
                style={{ ...s.sendBtn, opacity: !commentText.trim() || sending ? 0.4 : 1 }}
              >
                전송
              </button>
            </form>
          </div>
        </div>
      </motion.div>

      {/* 사진 라이트박스 */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            style={s.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxSrc(null)}
          >
            <img src={lightboxSrc} alt="" style={s.lightboxImg} onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" },
  modal: { background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "600px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },

  header: { padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 },
  pinLabel: { fontSize: "12px", color: "#aaa", margin: "0 0 6px" },
  authorRow: { display: "flex", alignItems: "center", gap: "8px" },
  avatar: { width: "28px", height: "28px", background: "#222", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 },
  author: { fontSize: "14px", fontWeight: 700, color: "#333" },
  date: { fontSize: "12px", color: "#bbb" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#ccc", padding: "0", lineHeight: 1, flexShrink: 0 },

  body: { padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" },
  visitBadge: { fontSize: "12px", color: "#DC3611", fontWeight: 600, background: "rgba(220,54,17,0.08)", padding: "4px 12px", borderRadius: "20px", alignSelf: "flex-start" },
  title: { fontSize: "1.15rem", fontWeight: 800, color: "#111", margin: 0 },
  content: { fontSize: "15px", color: "#444", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" },

  gallery: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" },
  galleryImg: { height: "200px", width: "auto", borderRadius: "12px", objectFit: "cover", cursor: "pointer", flexShrink: 0, transition: "opacity 0.15s" },

  commentSection: { borderTop: "1px solid #f0f0f0", paddingTop: "14px" },
  commentHeading: { fontSize: "13px", fontWeight: 700, color: "#888", margin: "0 0 12px" },
  dimText: { fontSize: "13px", color: "#ccc", margin: 0 },
  commentList: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" },
  commentItem: { display: "flex", alignItems: "flex-start", gap: "8px" },
  commentAvatar: { width: "26px", height: "26px", background: "#f0f0f0", color: "#333", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: "12px", fontWeight: 700, color: "#555" },
  commentText: { fontSize: "13px", color: "#444", margin: "2px 0 0", lineHeight: 1.5 },
  commentDate: { fontSize: "11px", color: "#ddd", flexShrink: 0, marginTop: "2px" },

  commentForm: { display: "flex", gap: "8px" },
  commentInput: { flex: 1, padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: "22px", fontSize: "14px", outline: "none" },
  sendBtn: { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: "22px", cursor: "pointer", fontSize: "13px", fontWeight: 700, flexShrink: 0 },

  lightbox: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  lightboxImg: { maxWidth: "90vw", maxHeight: "90vh", borderRadius: "8px", objectFit: "contain" },
};

export default PostDetailModal;
