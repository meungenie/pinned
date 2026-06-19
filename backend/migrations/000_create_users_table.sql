CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  handle        VARCHAR(50)  NOT NULL UNIQUE,
  username      VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
