import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchMyGroups,
  createGroup,
  getGroupByInviteCode,
  joinGroup,
} from "../api/groupApi";
import { logoutUser } from "../api/authApi";
import { c, r, t, tap, modalPop } from "../theme";

const EMOJI_PRESETS = ["📍", "🍊", "🏝️", "🍜", "☕", "⛰️", "🎡", "🐾"];

const Groups = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // 그룹 만들기 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createEmoji, setCreateEmoji] = useState("");
  const [creating, setCreating] = useState(false);

  // 초대 코드 모달
  const [showJoin, setShowJoin] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    fetchMyGroups()
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreateName("");
    setCreateDesc("");
    setCreateEmoji("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const group = await createGroup({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        emoji: createEmoji || undefined,
      });
      setGroups((prev) => [group, ...prev]);
      closeCreate();
      navigate(`/groups/${group.id}`, { state: { group } });
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCodeLookup = async () => {
    if (!inviteInput.trim()) return;
    setPreviewLoading(true);
    setJoinError("");
    setPreview(null);
    try {
      const g = await getGroupByInviteCode(inviteInput.trim());
      setPreview(g);
    } catch {
      setJoinError("유효하지 않은 초대 코드예요.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!preview) return;
    setJoining(true);
    try {
      const result = await joinGroup(inviteInput.trim());
      setShowJoin(false);
      setInviteInput("");
      setPreview(null);
      const updatedGroups = await fetchMyGroups();
      setGroups(updatedGroups);
      navigate(`/groups/${result.group_id}`);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const closeJoin = () => {
    setShowJoin(false);
    setPreview(null);
    setInviteInput("");
    setJoinError("");
  };

  const memberPreview = (group) => {
    const handles = group.member_handles || [];
    if (!handles.length) return `멤버 ${group.member_count}명`;
    const shown = handles
      .slice(0, 3)
      .map((h) => `@${h}`)
      .join(" ");
    const rest = Number(group.member_count) - Math.min(handles.length, 3);
    return rest > 0 ? `${shown} 외 ${rest}명` : shown;
  };

  return (
    <div style={s.page}>
      {/* 헤더 */}
      <header style={s.header}>
        <span style={s.logo}>
          pinned<span style={{ color: c.pin }}>.</span>
        </span>
        <div style={s.headerRight}>
          <span style={s.userHandle}>@{user?.handle}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main style={s.main}>
        <div style={s.titleRow}>
          <div>
            <h2 style={s.sectionTitle}>내 그룹</h2>
            <p style={s.sectionMeta}>
              {loading ? " " : `${groups.length} groups`}
            </p>
          </div>
          <div style={s.actionBtns}>
            <motion.button
              whileTap={tap}
              onClick={() => setShowJoin(true)}
              style={s.secondaryBtn}
            >
              초대 코드로 입장
            </motion.button>
            <motion.button
              whileTap={tap}
              onClick={() => setShowCreate(true)}
              style={s.primaryBtn}
            >
              + 새 그룹
            </motion.button>
          </div>
        </div>

        {loading ? (
          <div style={s.empty}>
            <p style={s.emptyText}>불러오는 중...</p>
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            style={s.emptyState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t.base}
          >
            <div style={s.emptyPin} />
            <p style={s.emptyTitle}>아직 그룹이 없어요.</p>
            <p style={s.emptySubtitle}>첫 지도를 만들고 친구를 초대해보세요.</p>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <motion.button
                whileTap={tap}
                onClick={() => setShowCreate(true)}
                style={s.primaryBtn}
              >
                새 그룹
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={() => setShowJoin(true)}
                style={s.secondaryBtn}
              >
                초대 코드로 입장
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div style={s.grid}>
            {groups.map((group, i) => (
              <motion.div
                key={group.id}
                style={s.card}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t.base, delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                whileTap={tap}
                onClick={() =>
                  navigate(`/groups/${group.id}`, { state: { group } })
                }
              >
                <div style={s.cardTop}>
                  <span style={s.cardEmoji}>{group.emoji || "📍"}</span>
                  {group.role === "owner" && (
                    <span style={s.ownerLabel}>방장</span>
                  )}
                </div>
                <h3 style={s.cardName}>{group.name}</h3>
                {group.description && (
                  <p style={s.cardDesc}>{group.description}</p>
                )}
                <div style={s.cardDivider} />
                <p style={s.cardMembers}>{memberPreview(group)}</p>
                <p style={s.cardMeta}>핀 {group.pin_count}개</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* 그룹 만들기 모달 */}
      <AnimatePresence>
        {showCreate && (
          <div style={s.overlay} onClick={closeCreate}>
            <motion.div
              style={s.modal}
              {...modalPop}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={s.modalTitle}>새 그룹</h3>
              <form
                onSubmit={handleCreate}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <input
                  autoFocus
                  placeholder="그룹 이름 *"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  style={s.input}
                  required
                />
                <input
                  placeholder="그룹 설명 (선택)"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  style={s.input}
                />
                <div>
                  <p style={s.emojiLabel}>대표 이모지 (선택)</p>
                  <div style={s.emojiRow}>
                    {EMOJI_PRESETS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() =>
                          setCreateEmoji(createEmoji === em ? "" : em)
                        }
                        style={{
                          ...s.emojiBtn,
                          borderColor: createEmoji === em ? c.ink : c.hairline,
                          background: createEmoji === em ? c.bg : c.surface,
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={s.modalBtns}>
                  <button
                    type="button"
                    onClick={closeCreate}
                    style={s.cancelBtn}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !createName.trim()}
                    style={{
                      ...s.primaryBtn,
                      opacity: creating || !createName.trim() ? 0.5 : 1,
                    }}
                  >
                    {creating ? "생성 중..." : "만들기"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 초대 코드 입장 모달 */}
      <AnimatePresence>
        {showJoin && (
          <div style={s.overlay} onClick={closeJoin}>
            <motion.div
              style={s.modal}
              {...modalPop}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={s.modalTitle}>초대 코드로 입장</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  autoFocus
                  placeholder="초대 코드를 입력하세요"
                  value={inviteInput}
                  onChange={(e) => {
                    setInviteInput(e.target.value);
                    setPreview(null);
                    setJoinError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCodeLookup()}
                  style={{ ...s.input, flex: 1 }}
                />
                <button
                  onClick={handleCodeLookup}
                  disabled={previewLoading}
                  style={{ ...s.primaryBtn, whiteSpace: "nowrap" }}
                >
                  {previewLoading ? "..." : "확인"}
                </button>
              </div>

              {joinError && (
                <p
                  style={{ color: c.pin, fontSize: "13px", margin: "4px 0 0" }}
                >
                  {joinError}
                </p>
              )}

              {preview && (
                <motion.div
                  style={s.previewCard}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={t.fast}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "16px",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {preview.emoji ? `${preview.emoji} ` : ""}
                    {preview.name}
                  </p>
                  {preview.description && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "13px",
                        color: c.gray,
                      }}
                    >
                      {preview.description}
                    </p>
                  )}
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "12px",
                      color: c.grayLight,
                    }}
                  >
                    멤버 {preview.member_count}명
                  </p>
                </motion.div>
              )}

              <div style={s.modalBtns}>
                <button onClick={closeJoin} style={s.cancelBtn}>
                  취소
                </button>
                <button
                  onClick={handleJoin}
                  disabled={!preview || joining}
                  style={{
                    ...s.primaryBtn,
                    opacity: !preview || joining ? 0.5 : 1,
                  }}
                >
                  {joining ? "가입 중..." : "입장하기"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const s = {
  page: {
    minHeight: "100vh",
    background: c.bg,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    height: "64px",
    padding: "0 48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: c.bg,
    borderBottom: `1px solid ${c.hairline}`,
  },
  logo: {
    fontSize: "1.6rem",
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: c.ink,
  },
  headerRight: { display: "flex", alignItems: "center", gap: "18px" },
  userHandle: { fontSize: "13px", color: c.gray },
  logoutBtn: {
    padding: 0,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    color: c.gray,
    fontFamily: "inherit",
  },

  main: {
    flex: 1,
    padding: "44px 48px 80px",
    maxWidth: "1100px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  titleRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: c.ink,
    margin: 0,
    letterSpacing: "-0.03em",
  },
  sectionMeta: {
    fontSize: "12px",
    color: c.grayLight,
    margin: "4px 0 0",
    letterSpacing: "0.01em",
  },
  actionBtns: { display: "flex", gap: "8px" },
  primaryBtn: {
    padding: "10px 20px",
    background: c.ink,
    color: c.bg,
    border: "none",
    borderRadius: `${r.pill}px`,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    fontFamily: "inherit",
    letterSpacing: "-0.01em",
  },
  secondaryBtn: {
    padding: "10px 20px",
    background: "transparent",
    color: c.ink,
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.pill}px`,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily: "inherit",
    letterSpacing: "-0.01em",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "14px",
  },
  card: {
    background: c.surface,
    borderRadius: `${r.card}px`,
    padding: "22px",
    cursor: "pointer",
    border: `1px solid ${c.hairline}`,
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  cardEmoji: { fontSize: "26px", lineHeight: 1 },
  ownerLabel: { fontSize: "11px", color: c.grayLight, fontWeight: 500 },
  cardName: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: c.ink,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  cardDesc: {
    fontSize: "13px",
    color: c.gray,
    margin: "6px 0 0",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    lineHeight: 1.5,
  },
  cardDivider: { height: "1px", background: c.hairline, margin: "14px 0 12px" },
  cardMembers: { fontSize: "12px", color: c.gray, margin: 0 },
  cardMeta: { fontSize: "12px", color: c.grayLight, margin: "4px 0 0" },

  empty: { display: "flex", justifyContent: "center", padding: "80px 0" },
  emptyText: { color: c.grayLight },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50vh",
  },
  emptyPin: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: c.pin,
    marginBottom: "20px",
    boxShadow: `0 0 0 6px ${c.surface}, 0 0 0 7px ${c.hairline}`,
  },
  emptyTitle: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: c.ink,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  emptySubtitle: { fontSize: "14px", color: c.gray, margin: "8px 0 0" },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(16,16,18,0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modal: {
    background: c.surface,
    borderRadius: `${r.card}px`,
    padding: "28px",
    width: "400px",
    border: `1px solid ${c.hairline}`,
    boxShadow: "0 20px 60px rgba(16,16,18,0.16)",
  },
  modalTitle: {
    fontSize: "1.15rem",
    fontWeight: 800,
    margin: "0 0 18px",
    letterSpacing: "-0.02em",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.control}px`,
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    background: c.surface,
    color: c.ink,
  },
  emojiLabel: {
    fontSize: "12px",
    color: c.gray,
    margin: "0 0 8px",
    fontWeight: 500,
  },
  emojiRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  emojiBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  modalBtns: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    marginTop: "10px",
  },
  cancelBtn: {
    padding: "10px 18px",
    background: "transparent",
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.pill}px`,
    cursor: "pointer",
    fontSize: "14px",
    color: c.ink,
    fontFamily: "inherit",
  },
  previewCard: {
    background: c.bg,
    borderRadius: `${r.control}px`,
    padding: "16px",
    marginTop: "10px",
    border: `1px solid ${c.hairline}`,
  },
};

export default Groups;
