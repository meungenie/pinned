-- 그룹
CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 그룹 멤버 (owner / member)
CREATE TABLE IF NOT EXISTS group_members (
  group_id  INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- pins에 그룹 귀속 + 작성자 추가
ALTER TABLE pins
  ADD COLUMN IF NOT EXISTS group_id   INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- 핀에 대한 각 유저의 기록 (게시글)
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  pin_id     INTEGER NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  title      VARCHAR(255),
  content    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 게시글 사진
CREATE TABLE IF NOT EXISTS post_photos (
  id          SERIAL PRIMARY KEY,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 댓글
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
