import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MapView from "../components/MapView";
import PinRecordCard from "../components/PinRecordCard";
import exifr from "exifr";
import {
  fetchGroupInfo,
  fetchGroupPins,
  createGroupPin,
  generateTripSummary,
} from "../api/groupApi";
import { fetchPinPosts, createPost } from "../api/postApi";
import { uploadPhoto } from "../utils/uploadPhoto";
import { c, r, t } from "../theme";

const today = () => new Date().toISOString().split("T")[0];

const GroupMap = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const titleInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const panelPhotoInputRef = useRef(null);

  const [group, setGroup] = useState(location.state?.group || null);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);

  // 핀 생성 모달
  const [pendingCoords, setPendingCoords] = useState(null);
  const [pinTitle, setPinTitle] = useState("");
  const [visitedFrom, setVisitedFrom] = useState(today());
  const [visitedTo, setVisitedTo] = useState(today());
  const [memo, setMemo] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState([]); // File[]
  const [saving, setSaving] = useState(false);

  // 핀 상세 패널
  const [selectedPin, setSelectedPin] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // 패널 내 게시글 작성 폼
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postVisitedFrom, setPostVisitedFrom] = useState(today());
  const [postVisitedTo, setPostVisitedTo] = useState(today());
  const [panelPhotos, setPanelPhotos] = useState([]); // File[]
  const [postSaving, setPostSaving] = useState(false);

  const [copied, setCopied] = useState(false);

  // EXIF 위치 추출 알림
  const [exifHint, setExifHint] = useState(false);

  // AI 여행 요약
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [groupData, pinsData] = await Promise.all([
          group ? Promise.resolve(group) : fetchGroupInfo(groupId),
          fetchGroupPins(groupId),
        ]);
        setGroup(groupData);
        setPins(pinsData);
      } catch (err) {
        console.error(err);
        if (err.message.includes("멤버")) navigate("/groups");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [groupId]);

  useEffect(() => {
    if (pendingCoords && titleInputRef.current) titleInputRef.current.focus();
  }, [pendingCoords]);

  const resetPinForm = () => {
    setPendingCoords(null);
    setPinTitle("");
    setVisitedFrom(today());
    setVisitedTo(today());
    setMemo("");
    setPendingPhotos([]);
  };

  const resetPostForm = () => {
    setShowPostForm(false);
    setPostTitle("");
    setPostContent("");
    setPostVisitedFrom(today());
    setPostVisitedTo(today());
    setPanelPhotos([]);
  };

  const handleMapClick = (coords) => {
    setSelectedPin(null);
    setPendingCoords(coords);
    setPinTitle(coords.title || "");
    setVisitedFrom(today());
    setVisitedTo(today());
    setMemo("");
    setPendingPhotos([]);
  };

  const handlePinClick = async (pin) => {
    setPendingCoords(null);
    setSelectedPin(pin);
    resetPostForm();
    setPostsLoading(true);
    try {
      const data = await fetchPinPosts(pin.id);
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  // 사진 업로드 헬퍼 (백엔드에서 업로드+저장 일괄 처리)
  const uploadPhotosForPost = async (postId, files) => {
    await Promise.all(files.map((file, i) => uploadPhoto(file, postId, i)));
  };

  const handleSavePin = async () => {
    if (!pinTitle.trim()) return;
    setSaving(true);
    try {
      const newPin = await createGroupPin(groupId, {
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        title: pinTitle.trim(),
      });

      if (memo.trim() || visitedFrom || pendingPhotos.length > 0) {
        const newPost = await createPost(newPin.id, {
          title: pinTitle.trim(),
          content: memo.trim() || null,
          visited_from: visitedFrom || null,
          visited_to: visitedTo || null,
        });
        if (pendingPhotos.length > 0) {
          await uploadPhotosForPost(newPost.id, pendingPhotos);
        }
        newPin.post_count = 1;
      }

      setPins((prev) => [newPin, ...prev]);
      resetPinForm();
    } catch (err) {
      alert("저장에 실패했어요: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePost = async () => {
    if (!postContent.trim()) return;
    setPostSaving(true);
    try {
      const newPost = await createPost(selectedPin.id, {
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        visited_from: postVisitedFrom || null,
        visited_to: postVisitedTo || null,
      });
      if (panelPhotos.length > 0) {
        await uploadPhotosForPost(newPost.id, panelPhotos);
        const refreshed = await fetchPinPosts(selectedPin.id);
        setPosts(refreshed);
      } else {
        setPosts((prev) => [...prev, { ...newPost, photos: [] }]);
      }
      setPins((prev) =>
        prev.map((p) =>
          p.id === selectedPin.id
            ? { ...p, post_count: Number(p.post_count) + 1 }
            : p,
        ),
      );
      resetPostForm();
    } catch (err) {
      alert("게시글 저장에 실패했어요: " + err.message);
    } finally {
      setPostSaving(false);
    }
  };

  const handlePhotoSelect = async (e, setPhotos) => {
    const files = Array.from(e.target.files);
    setPhotos((prev) => [...prev, ...files]);

    // EXIF GPS 추출 (핀 생성 모달에서만 좌표 업데이트)
    if (setPhotos === setPendingPhotos && pendingCoords) {
      for (const file of files) {
        try {
          const gps = await exifr.gps(file);
          if (gps?.latitude && gps?.longitude) {
            setPendingCoords((prev) => ({
              ...prev,
              lat: gps.latitude,
              lng: gps.longitude,
            }));
            setExifHint(true);
            setTimeout(() => setExifHint(false), 3000);
            break;
          }
        } catch {
          // EXIF 없는 사진은 그냥 넘김
        }
      }
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setShowSummary(true);
    setSummaryText("");
    try {
      const text = await generateTripSummary(groupId);
      setSummaryText(text);
    } catch (err) {
      setSummaryText("요약 생성에 실패했어요: " + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (!group?.invite_code) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderPhotoThumbs = (files, onRemove) =>
    files.map((file, i) => (
      <div key={i} style={s.thumb}>
        <img src={URL.createObjectURL(file)} alt="" style={s.thumbImg} />
        <button style={s.thumbRemove} onClick={() => onRemove(i)}>
          ✕
        </button>
      </div>
    ));

  if (loading) {
    return (
      <div style={s.loadingScreen}>
        <p>지도를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <MapView
        pins={pins}
        onMapClick={handleMapClick}
        onPinClick={handlePinClick}
      />

      <button style={s.backBtn} onClick={() => navigate("/groups")}>
        ← 그룹 목록
      </button>

      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 10,
          display: "flex",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <button style={s.summaryBtn} onClick={handleGenerateSummary}>
          AI 여행 요약
        </button>
        <button style={s.inviteBtn} onClick={handleCopyInvite}>
          초대 코드
        </button>
        <AnimatePresence>
          {copied && (
            <motion.div
              style={s.toast}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={t.fast}
            >
              복사됨 · {group?.invite_code}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={s.groupNameBadge}>
        {group?.emoji ? `${group.emoji} ` : ""}
        {group?.name}
      </div>

      {/* ── 핀 생성 모달 ── */}
      <AnimatePresence>
        {pendingCoords && (
          <div style={s.modalOverlay}>
            <motion.div
              style={s.modal}
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={t.base}
            >
              <p style={s.modalCoords}>
                {pendingCoords.lat.toFixed(4)}, {pendingCoords.lng.toFixed(4)}
              </p>

              <input
                ref={titleInputRef}
                type="text"
                placeholder="장소 이름 *"
                value={pinTitle}
                onChange={(e) => setPinTitle(e.target.value)}
                style={s.modalInput}
              />

              <div style={s.dateRow}>
                <div style={s.dateField}>
                  <label style={s.dateLabel}>방문 시작</label>
                  <input
                    type="date"
                    value={visitedFrom}
                    style={s.dateInput}
                    onChange={(e) => {
                      setVisitedFrom(e.target.value);
                      if (e.target.value > visitedTo)
                        setVisitedTo(e.target.value);
                    }}
                  />
                </div>
                <span style={s.dateSep}>~</span>
                <div style={s.dateField}>
                  <label style={s.dateLabel}>방문 종료</label>
                  <input
                    type="date"
                    value={visitedTo}
                    min={visitedFrom}
                    style={s.dateInput}
                    onChange={(e) => setVisitedTo(e.target.value)}
                  />
                </div>
              </div>

              <textarea
                placeholder="메모 (선택)"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                style={s.textarea}
              />

              {/* 사진 추가 */}
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handlePhotoSelect(e, setPendingPhotos)}
                />
                <button
                  style={s.photoAddBtn}
                  onClick={() => photoInputRef.current?.click()}
                >
                  + 사진 추가
                </button>
                {exifHint && <p style={s.exifHint}>사진에서 위치를 찾았어요</p>}
                {pendingPhotos.length > 0 && (
                  <div style={s.thumbRow}>
                    {renderPhotoThumbs(pendingPhotos, (i) =>
                      setPendingPhotos((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      ),
                    )}
                  </div>
                )}
              </div>

              <div style={s.modalBtns}>
                <button onClick={resetPinForm} style={s.cancelBtn}>
                  취소
                </button>
                <button
                  onClick={handleSavePin}
                  disabled={saving || !pinTitle.trim()}
                  style={{
                    ...s.pinSaveBtn,
                    opacity: saving || !pinTitle.trim() ? 0.5 : 1,
                  }}
                >
                  {saving ? "저장 중..." : "핀 꽂기"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 핀 기록 카드 (폴더 탭) ── */}
      <AnimatePresence>
        {selectedPin && (
          <motion.div
            style={s.recordOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.base}
            onClick={() => {
              setSelectedPin(null);
              resetPostForm();
            }}
          >
            <button
              style={s.recordCloseBtn}
              onClick={() => {
                setSelectedPin(null);
                resetPostForm();
              }}
            >
              ✕
            </button>
            <PinRecordCard
              key={selectedPin.id}
              pin={selectedPin}
              posts={posts}
              loading={postsLoading}
              onAddRecord={() => setShowPostForm(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 기록 작성 모달 ── */}
      <AnimatePresence>
        {showPostForm && selectedPin && (
          <div style={s.formOverlay}>
            <motion.div
              style={s.modal}
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={t.base}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 700,
                    color: c.ink,
                    letterSpacing: "-0.02em",
                  }}
                >
                  기록 남기기
                </h4>
                <button style={s.closeBtn} onClick={resetPostForm}>
                  ✕
                </button>
              </div>
              <input
                placeholder="제목 (선택)"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                style={s.modalInput}
              />
              <div style={s.dateRow}>
                <div style={s.dateField}>
                  <label style={s.dateLabel}>방문 시작</label>
                  <input
                    type="date"
                    value={postVisitedFrom}
                    style={s.dateInput}
                    onChange={(e) => {
                      setPostVisitedFrom(e.target.value);
                      if (e.target.value > postVisitedTo)
                        setPostVisitedTo(e.target.value);
                    }}
                  />
                </div>
                <span style={s.dateSep}>~</span>
                <div style={s.dateField}>
                  <label style={s.dateLabel}>방문 종료</label>
                  <input
                    type="date"
                    value={postVisitedTo}
                    min={postVisitedFrom}
                    style={s.dateInput}
                    onChange={(e) => setPostVisitedTo(e.target.value)}
                  />
                </div>
              </div>
              <textarea
                placeholder="내용을 입력하세요..."
                value={postContent}
                rows={4}
                onChange={(e) => setPostContent(e.target.value)}
                style={s.textarea}
                autoFocus
              />
              <input
                ref={panelPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) =>
                  setPanelPhotos((prev) => [
                    ...prev,
                    ...Array.from(e.target.files),
                  ])
                }
              />
              <button
                style={s.photoAddBtn}
                onClick={() => panelPhotoInputRef.current?.click()}
              >
                + 사진 추가
              </button>
              {panelPhotos.length > 0 && (
                <div style={s.thumbRow}>
                  {renderPhotoThumbs(panelPhotos, (i) =>
                    setPanelPhotos((prev) =>
                      prev.filter((_, idx) => idx !== i),
                    ),
                  )}
                </div>
              )}
              <div style={s.modalBtns}>
                <button onClick={resetPostForm} style={s.cancelBtn}>
                  취소
                </button>
                <button
                  onClick={handleSavePost}
                  disabled={postSaving || !postContent.trim()}
                  style={{
                    ...s.saveBtn,
                    opacity: postSaving || !postContent.trim() ? 0.5 : 1,
                  }}
                >
                  {postSaving ? "저장 중..." : "올리기"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── AI 여행 요약 모달 ── */}
      <AnimatePresence>
        {showSummary && (
          <div style={s.modalOverlay}>
            <motion.div
              style={{ ...s.modal, width: "480px" }}
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={t.base}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                  }}
                >
                  AI 여행 요약
                </h3>
                <button
                  style={s.closeBtn}
                  onClick={() => setShowSummary(false)}
                >
                  ✕
                </button>
              </div>
              {summaryLoading ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <p style={{ color: c.ink, fontWeight: 600, margin: 0 }}>
                    여행 기록을 분석하고 있어요...
                  </p>
                  <p
                    style={{
                      color: c.grayLight,
                      fontSize: "13px",
                      marginTop: "8px",
                    }}
                  >
                    잠시만 기다려 주세요
                  </p>
                </div>
              ) : (
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.8,
                    fontSize: "14px",
                    color: c.ink,
                    margin: 0,
                  }}
                >
                  {summaryText}
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const glassBtn = {
  padding: "10px 18px",
  background: "rgba(255,255,255,0.9)",
  border: `1px solid ${c.hairline}`,
  borderRadius: `${r.pill}px`,
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  color: c.ink,
  backdropFilter: "blur(10px)",
  boxShadow: "0 2px 12px rgba(16,16,18,0.08)",
  fontFamily: "inherit",
  letterSpacing: "-0.01em",
};

const s = {
  container: {
    width: "100vw",
    height: "100vh",
    position: "relative",
    overflow: "hidden",
  },
  loadingScreen: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: c.bg,
    color: c.gray,
  },

  backBtn: {
    ...glassBtn,
    position: "absolute",
    top: "16px",
    left: "16px",
    zIndex: 10,
  },
  groupNameBadge: {
    position: "absolute",
    top: "70px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    background: "rgba(16,16,18,0.82)",
    color: "#fff",
    padding: "8px 20px",
    borderRadius: `${r.pill}px`,
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    backdropFilter: "blur(10px)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },
  inviteBtn: { ...glassBtn },
  summaryBtn: {
    ...glassBtn,
    background: "rgba(16,16,18,0.88)",
    color: "#fff",
    border: "none",
  },
  toast: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: c.ink,
    color: c.bg,
    padding: "8px 14px",
    borderRadius: "10px",
    fontSize: "12px",
    whiteSpace: "nowrap",
    zIndex: 20,
  },

  modalOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    pointerEvents: "none",
  },
  modal: {
    background: c.surface,
    borderRadius: `${r.card}px`,
    padding: "24px",
    width: "340px",
    maxHeight: "90vh",
    overflowY: "auto",
    border: `1px solid ${c.hairline}`,
    boxShadow: "0 8px 40px rgba(16,16,18,0.16)",
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  modalCoords: {
    margin: 0,
    fontSize: "11px",
    color: c.grayLight,
    fontFamily: "monospace",
    letterSpacing: "0.02em",
  },
  modalInput: {
    width: "100%",
    padding: "11px 14px",
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.control}px`,
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    color: c.ink,
    background: c.surface,
  },
  dateRow: { display: "flex", alignItems: "flex-end", gap: "8px" },
  dateField: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  dateLabel: { fontSize: "11px", color: c.gray, fontWeight: 500 },
  dateInput: {
    padding: "8px 10px",
    border: `1px solid ${c.hairline}`,
    borderRadius: "10px",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    color: c.ink,
    background: c.surface,
  },
  dateSep: {
    fontSize: "14px",
    color: c.grayLight,
    paddingBottom: "8px",
    flexShrink: 0,
  },
  textarea: {
    width: "100%",
    padding: "11px 14px",
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.control}px`,
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "inherit",
    lineHeight: 1.6,
    color: c.ink,
    background: c.surface,
  },
  photoAddBtn: {
    padding: "8px 16px",
    background: c.bg,
    color: c.ink,
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.pill}px`,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    fontFamily: "inherit",
  },
  thumbRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" },
  thumb: { position: "relative", width: "70px", height: "70px" },
  thumbImg: {
    width: "70px",
    height: "70px",
    objectFit: "cover",
    borderRadius: "12px",
  },
  thumbRemove: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    width: "20px",
    height: "20px",
    background: c.ink,
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  modalBtns: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  cancelBtn: {
    padding: "9px 18px",
    border: `1px solid ${c.hairline}`,
    borderRadius: `${r.pill}px`,
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    color: c.ink,
    fontFamily: "inherit",
  },
  saveBtn: {
    padding: "9px 18px",
    border: "none",
    borderRadius: `${r.pill}px`,
    background: c.ink,
    color: c.bg,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    fontFamily: "inherit",
  },
  // "핀 꽂기"는 앱의 핵심 액션이라 유일하게 빨강 허용
  pinSaveBtn: {
    padding: "9px 18px",
    border: "none",
    borderRadius: `${r.pill}px`,
    background: c.pin,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    fontFamily: "inherit",
  },

  // 기록 카드 오버레이 (지도 위 전체)
  recordOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 15,
    background: "rgba(16,16,18,0.42)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  recordCloseBtn: {
    position: "absolute",
    top: "18px",
    right: "18px",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    color: c.grayLight,
    padding: "0 4px",
    lineHeight: 1,
  },

  // 기록 작성 모달
  formOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    background: "rgba(16,16,18,0.5)",
    pointerEvents: "auto",
  },

  exifHint: {
    margin: "6px 0 0",
    fontSize: "12px",
    color: c.gray,
    fontWeight: 500,
  },
};

export default GroupMap;
