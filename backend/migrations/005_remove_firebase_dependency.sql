-- Firebase 의존성 제거: password_hash NOT NULL 복원
ALTER TABLE users
  ALTER COLUMN password_hash SET NOT NULL;
