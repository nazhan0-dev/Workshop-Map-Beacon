// สร้างฐานข้อมูล + ตาราง และใส่ข้อมูลตัวอย่าง (ใส่เฉพาะตอนยังไม่มีผู้ใช้)
// รัน: npm run db:init
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { toDateStr, addDays } from "../src/utils/shifts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = process.env.DB_NAME || "workshop_map";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
});

await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.query(`USE \`${DB}\``);
await conn.query(fs.readFileSync(path.join(__dirname, "../sql/schema.sql"), "utf8"));
console.log(`✓ ฐานข้อมูล ${DB} และตารางพร้อมแล้ว`);

const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM users");
if (n > 0) {
  console.log("มีผู้ใช้อยู่แล้ว ข้ามการใส่ข้อมูลตัวอย่าง");
  await conn.end();
  process.exit(0);
}

const adminHash = await bcrypt.hash("admin1234", 10);
const userHash = await bcrypt.hash("123456", 10);

await conn.query(
  "INSERT INTO users (name, username, password_hash, role, position, phone) VALUES ?",
  [[
    ["ผู้ดูแลระบบ", "admin", adminHash, "ADMIN", "ผู้ดูแลระบบ", "080-000-0000"],
    ["สมชาย ใจดี", "somchai", userHash, "USER", "หัวหน้าเวร", "081-111-1111"],
    ["สมหญิง รักงาน", "somying", userHash, "USER", "รองหัวหน้า", "081-222-2222"],
    ["วิชัย มานะ", "wichai", userHash, "USER", "เจ้าหน้าที่", "081-333-3333"],
    ["สุดา สวยงาม", "suda", userHash, "USER", "เจ้าหน้าที่", "081-444-4444"],
    ["ประยุทธ ขยัน", "prayut", userHash, "USER", "เจ้าหน้าที่", "081-555-5555"],
    ["มาลี ยิ้มแย้ม", "malee", userHash, "USER", "เจ้าหน้าที่", "081-666-6666"],
    ["ธนา ใจกล้า", "thana", userHash, "USER", "เจ้าหน้าที่", "081-777-7777"],
  ]]
);

await conn.query(
  `INSERT INTO locations (name, lat, lng, duties, cautions, contact_phone, need_morning, need_afternoon, need_night) VALUES ?`,
  [[
    ["ประตูทางเข้าหลัก", 13.7651, 100.5066, "ตรวจบัตรผู้มาติดต่อทุกคน แลกบัตรก่อนเข้าอาคาร", "ห้ามจอดรถขวางทางเข้า", "02-111-1234", 2, 2, 2],
    ["ลานจอดรถ B", 13.7638, 100.5089, "ดูแลการจอดรถ ตรวจรถเข้า-ออก", "ระวังรถถอยหลังช่วงเลิกงาน", "02-111-2345", 2, 1, 1],
    ["อาคารสำนักงาน A", 13.7629, 100.5064, "เดินตรวจทุกชั้นทุก 2 ชั่วโมง", "ปิดไฟห้องที่ไม่มีคนหลัง 20:00", "02-111-3456", 2, 2, 1],
    ["จุดตรวจประตูหลัง", 13.7617, 100.5049, "เปิด-ปิดประตูให้รถขนส่ง", "ตรวจใบส่งของทุกครั้ง", "02-111-4567", 1, 1, 1],
    ["คลังสินค้า", 13.7611, 100.5081, "ตรวจล็อกประตูคลังและกล้อง", "ห้ามบุคคลภายนอกเข้า", "02-111-5678", 2, 1, 2],
  ]]
);

// เวรตัวอย่างวันนี้และพรุ่งนี้
const today = toDateStr(new Date());
const tomorrow = addDays(today, 1);
await conn.query(
  "INSERT INTO assignments (user_id, location_id, date, shift) VALUES ?",
  [[
    [2, 1, today, "MORNING"], [3, 1, today, "MORNING"],
    [6, 2, today, "MORNING"],
    [4, 3, today, "MORNING"], [8, 3, today, "MORNING"],
    [5, 1, today, "AFTERNOON"], [7, 2, today, "AFTERNOON"],
    [2, 2, tomorrow, "AFTERNOON"], [3, 1, tomorrow, "MORNING"],
  ]]
);

console.log("✓ ใส่ข้อมูลตัวอย่างแล้ว");
console.log("  ผู้ดูแล:  admin / admin1234");
console.log("  รปภ.:    somchai / 123456 (และคนอื่นๆ รหัส 123456)");
await conn.end();
