-- 006: 디자인 개편 + 스키마 정리
-- backend/migrations/006_design_update.sql
-- 전부 멱등(IF NOT EXISTS / IF EXISTS)이라 재실행 안전.

-- 그룹 대표 이모지 (보드 카드 표시용, 선택 입력)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS emoji VARCHAR(16);

-- 프로필 사진 URL (핀 마커/헤더 표시용, NULL이면 이니셜 폴백)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Firebase 잔재 제거 (005에서 의존성 제거했는데 컬럼은 남아 있었음)
ALTER TABLE users DROP COLUMN IF EXISTS firebase_uid;

-- FK 인덱스 (Postgres는 FK에 인덱스를 자동 생성하지 않음)
-- 핀/게시글/댓글 조회가 전부 이 컬럼 기준이라 데이터 쌓이면 체감됨
CREATE INDEX IF NOT EXISTS idx_pins_group_id     ON pins (group_id);
CREATE INDEX IF NOT EXISTS idx_posts_pin_id      ON posts (pin_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id  ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_post_photos_post_id ON post_photos (post_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);