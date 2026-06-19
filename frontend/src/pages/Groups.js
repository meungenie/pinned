import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMyGroups, createGroup, getGroupByInviteCode, joinGroup } from "../api/groupApi";
import { logoutUser } from "../api/authApi";

const Groups = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // 그룹 만들기 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const group = await createGroup({ name: createName.trim(), description: createDesc.trim() || undefined });
      setGroups((prev) => [group, ...prev]);
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
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

  return (
    <div style={s.page}>
      {/* 헤더 */}
      <header style={s.header}>
        <span style={s.logo}>pinned<span style={{ color: "#DC3611" }}>.</span></span>
        <div style={s.headerRight}>
          <span style={s.userHandle}>@{user?.handle}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>로그아웃</button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main style={s.main}>
        <div style={s.titleRow}>
          <h2 style={s.sectionTitle}>내 그룹</h2>
          <div style={s.actionBtns}>
            <button onClick={() => setShowJoin(true)} style={s.secondaryBtn}>초대 코드로 입장</button>
            <button onClick={() => setShowCreate(true)} style={s.primaryBtn}>+ 그룹 만들기</button>
          </div>
        </div>

        {loading ? (
          <div style={s.empty}><p style={s.emptyText}>불러오는 중...</p></div>
        ) : groups.length === 0 ? (
          <motion.div style={s.emptyState} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p style={s.emptyEmoji}>🌍</p>
            <p style={s.emptyTitle}>아직 참여 중인 그룹이 없어요.</p>
            <p style={s.emptySubtitle}>친구와 함께 장소를 기록해보세요!</p>
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setShowCreate(true)} style={s.primaryBtn}>그룹 만들기</button>
              <button onClick={() => setShowJoin(true)} style={s.secondaryBtn}>초대 코드로 입장</button>
            </div>
          </motion.div>
        ) : (
          <div style={s.grid}>
            {groups.map((group, i) => (
              <motion.div
                key={group.id}
                style={s.card}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/groups/${group.id}`, { state: { group } })}
                whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
              >
                <div style={s.cardTop}>
                  <h3 style={s.cardName}>{group.name}</h3>
                  {group.role === "owner" && <span style={s.ownerBadge}>방장</span>}
                </div>
                {group.description && <p style={s.cardDesc}>{group.description}</p>}
                <p style={s.cardMeta}>
                  멤버 {group.member_count}명 · 핀 {group.pin_count}개
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* 그룹 만들기 모달 */}
      <AnimatePresence>
        {showCreate && (
          <div style={s.overlay} onClick={() => setShowCreate(false)}>
            <motion.div
              style={s.modal}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={s.modalTitle}>새 그룹 만들기</h3>
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                <div style={s.modalBtns}>
                  <button type="button" onClick={() => setShowCreate(false)} style={s.cancelBtn}>취소</button>
                  <button type="submit" disabled={creating || !createName.trim()} style={{ ...s.primaryBtn, opacity: creating ? 0.6 : 1 }}>
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
          <div style={s.overlay} onClick={() => { setShowJoin(false); setPreview(null); setInviteInput(""); setJoinError(""); }}>
            <motion.div
              style={s.modal}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={s.modalTitle}>초대 코드로 입장</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  autoFocus
                  placeholder="초대 코드를 입력하세요"
                  value={inviteInput}
                  onChange={(e) => { setInviteInput(e.target.value); setPreview(null); setJoinError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleCodeLookup()}
                  style={{ ...s.input, flex: 1 }}
                />
                <button onClick={handleCodeLookup} disabled={previewLoading} style={{ ...s.primaryBtn, whiteSpace: "nowrap" }}>
                  {previewLoading ? "..." : "확인"}
                </button>
              </div>

              {joinError && <p style={{ color: "#e53e3e", fontSize: "13px", margin: "4px 0 0" }}>{joinError}</p>}

              {preview && (
                <motion.div style={s.previewCard} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "16px" }}>{preview.name}</p>
                  {preview.description && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>{preview.description}</p>}
                  <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#999" }}>멤버 {preview.member_count}명</p>
                </motion.div>
              )}

              <div style={s.modalBtns}>
                <button onClick={() => { setShowJoin(false); setPreview(null); setInviteInput(""); setJoinError(""); }} style={s.cancelBtn}>취소</button>
                <button onClick={handleJoin} disabled={!preview || joining} style={{ ...s.primaryBtn, opacity: !preview || joining ? 0.5 : 1 }}>
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
  page: { minHeight: "100vh", background: "#f8f9fa", display: "flex", flexDirection: "column" },
  header: { height: "64px", padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderBottom: "1px solid #eee" },
  logo: { fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-1px", color: "#222" },
  headerRight: { display: "flex", alignItems: "center", gap: "16px" },
  userHandle: { fontSize: "14px", color: "#888" },
  logoutBtn: { padding: "8px 18px", background: "#fff", border: "1px solid #eee", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
  main: { flex: 1, padding: "48px 48px 80px" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" },
  sectionTitle: { fontSize: "1.6rem", fontWeight: 800, color: "#111", margin: 0 },
  actionBtns: { display: "flex", gap: "10px" },
  primaryBtn: { padding: "10px 22px", background: "#111", color: "#fff", border: "none", borderRadius: "22px", cursor: "pointer", fontSize: "14px", fontWeight: 700 },
  secondaryBtn: { padding: "10px 22px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: "22px", cursor: "pointer", fontSize: "14px", fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" },
  card: { background: "#fff", borderRadius: "16px", padding: "24px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", transition: "box-shadow 0.2s" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" },
  cardName: { fontSize: "1.1rem", fontWeight: 800, color: "#111", margin: 0 },
  ownerBadge: { background: "#111", color: "#fff", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" },
  cardDesc: { fontSize: "13px", color: "#666", margin: "0 0 10px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  cardMeta: { fontSize: "12px", color: "#aaa", margin: 0 },
  empty: { display: "flex", justifyContent: "center", padding: "80px 0" },
  emptyText: { color: "#aaa" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh" },
  emptyEmoji: { fontSize: "3rem", margin: "0 0 16px" },
  emptyTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#333", margin: 0 },
  emptySubtitle: { fontSize: "14px", color: "#999", margin: "8px 0 0" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: "20px", padding: "32px", width: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalTitle: { fontSize: "1.2rem", fontWeight: 800, margin: "0 0 20px" },
  input: { width: "100%", padding: "12px 16px", border: "1px solid #e5e5e5", borderRadius: "12px", fontSize: "15px", outline: "none", boxSizing: "border-box" },
  modalBtns: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" },
  cancelBtn: { padding: "10px 20px", background: "#fff", border: "1px solid #ddd", borderRadius: "22px", cursor: "pointer", fontSize: "14px" },
  previewCard: { background: "#f5f5f5", borderRadius: "12px", padding: "16px", marginTop: "8px" },
};

export default Groups;
