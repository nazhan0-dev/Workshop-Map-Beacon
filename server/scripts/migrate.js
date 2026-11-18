// อัปเดตโครงสร้างฐานข้อมูลเดิมให้ตรงกับโค้ดล่าสุด (รันกี่ครั้งก็ได้ ไฟล์ที่รันแล้วจะข้าม)
// รัน: npm run db:migrate
// อ่านไฟล์ใน sql/migrations ตามลำดับชื่อ แล้วจดไว้ในตาราง schema_migrations ว่ารันอะไรไปแล้ว
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "../sql/migrations");
const DB = process.env.DB_NAME || "workshop_map";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: DB,
  multipleStatements: true,
});

await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(190) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

const hasColumn = async (table, col) => (await conn.query(
  "SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?", [DB, table, col]))[0].length > 0;
const hasTable = async (table) => (await conn.query(
  "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?", [DB, table]))[0].length > 0;

// ไฟล์ที่ออกก่อนมีสคริปต์นี้ อาจถูกรันเองใน Workbench ไปแล้ว: เช็กจากโครงสร้างจริงแทน
const ALREADY = {
  "001-add-rank.sql": () => hasColumn("users", "rank"),
  "002-add-incidents.sql": () => hasTable("incidents"),
  "003-add-leaves.sql": () => hasTable("leaves"),
  "004-add-check-in.sql": () => hasColumn("assignments", "check_in_at"),
};

const [doneRows] = await conn.query("SELECT name FROM schema_migrations");
const done = new Set(doneRows.map((r) => r.name));
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
let ran = 0;

for (const f of files) {
  if (done.has(f)) continue;
  if (ALREADY[f] && (await ALREADY[f]())) {
    await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [f]);
    console.log(`= ${f} (มีอยู่แล้ว)`);
    continue;
  }
  // ตัดบรรทัด USE ออก จะได้ใช้ชื่อฐานข้อมูลจาก .env
  const sql = fs.readFileSync(path.join(DIR, f), "utf8").replace(/^\s*USE\s+[^;]+;\s*$/gim, "");
  try {
    await conn.query(sql);
  } catch (e) {
    console.error(`✗ ${f} ไม่สำเร็จ: ${e.sqlMessage || e.message}`);
    await conn.end();
    process.exit(1);
  }
  await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [f]);
  console.log(`✓ ${f}`);
  ran++;
}

console.log(ran ? `อัปเดตฐานข้อมูล ${DB} แล้ว ${ran} ไฟล์` : `ฐานข้อมูล ${DB} เป็นเวอร์ชันล่าสุดแล้ว`);
await conn.end();
