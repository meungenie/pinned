require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const migrationsDir = path.join(__dirname, "../migrations");
const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function run() {
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`✅ ${file}`);
  }
  pool.end();
  console.log("🎉 모든 마이그레이션 완료");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  pool.end();
  process.exit(1);
});
