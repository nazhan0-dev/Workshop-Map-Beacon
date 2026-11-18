// จัดการพนักงาน (เฉพาะ ADMIN)
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { text, phone } from "../utils/validate.js";

const router = Router();
const COLS = "id, name, username, role, `rank`, position, phone, created_at";
const RANKS = ["HEAD", "DEPUTY", "STAFF"];

function pickBody(body = {}) {
  const name = text(body.name, { label: "ชื่อพนักงาน", max: 100, required: true });
  const username = String(body.username || "").trim().toLowerCase();
  const role = body.role === "ADMIN" ? "ADMIN" : "USER";
  const rank = RANKS.includes(body.rank) ? body.rank : "STAFF";
  if (!/^[a-z0-9_.]{3,50}$/.test(username)) {
    throw new HttpError(400, "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลข 3–50 ตัว");
  }
  return {
    name, username, role, rank,
    position: text(body.position, { label: "หน้าที่", max: 100 }),
    phone: phone(body.phone),
  };
}

function checkPassword(p) {
  if (typeof p !== "string" || p.length < 6) throw new HttpError(400, "รหัสผ่านต้องมีอย่างน้อย 6 ตัว");
  if (p.length > 72) throw new HttpError(400, "รหัสผ่านยาวได้ไม่เกิน 72 ตัว");
  return p;
}

// GET /api/users
router.get("/", async (req, res) => {
  res.json(await query(`SELECT ${COLS} FROM users ORDER BY role, FIELD(\`rank\`, 'HEAD', 'DEPUTY', 'STAFF'), name`));
});

// POST /api/users  { name, username, password, role, rank, position, phone }
router.post("/", async (req, res) => {
  const data = pickBody(req.body);
  const password = checkPassword(req.body.password);
  const r = await query(
    "INSERT INTO users (name, username, password_hash, role, `rank`, position, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [data.name, data.username, await bcrypt.hash(password, 10), data.role, data.rank, data.position, data.phone]
  );
  const [user] = await query(`SELECT ${COLS} FROM users WHERE id = ?`, [r.insertId]);
  res.status(201).json(user);
});

// PUT /api/users/:id
router.put("/:id", async (req, res) => {
  const data = pickBody(req.body);
  if (Number(req.params.id) === req.user.id && data.role !== "ADMIN") {
    throw new HttpError(400, "เปลี่ยนสิทธิ์ของตัวเองไม่ได้");
  }
  const r = await query(
    "UPDATE users SET name = ?, username = ?, role = ?, `rank` = ?, position = ?, phone = ? WHERE id = ?",
    [data.name, data.username, data.role, data.rank, data.position, data.phone, req.params.id]
  );
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบพนักงาน");
  const [user] = await query(`SELECT ${COLS} FROM users WHERE id = ?`, [req.params.id]);
  res.json(user);
});

// DELETE /api/users/:id  (เวรของคนนี้จะถูกลบตามไปด้วย)
router.delete("/:id", async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw new HttpError(400, "ลบบัญชีของตัวเองไม่ได้");
  const r = await query("DELETE FROM users WHERE id = ?", [req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบพนักงาน");
  res.json({ message: "ลบพนักงานแล้ว" });
});

// POST /api/users/:id/reset-password  { password }  (คนนั้นถูกออกจากระบบทุกอุปกรณ์)
router.post("/:id/reset-password", async (req, res) => {
  const password = checkPassword(req.body?.password);
  const r = await query(
    "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
    [await bcrypt.hash(password, 10), req.params.id]
  );
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบพนักงาน");
  res.json({ message: "รีเซ็ตรหัสผ่านแล้ว" });
});

export default router;
