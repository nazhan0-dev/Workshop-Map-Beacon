// จัดการพนักงาน (เฉพาะ ADMIN)
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";

const router = Router();
const COLS = "id, name, username, role, `rank`, position, phone, created_at";
const RANKS = ["HEAD", "DEPUTY", "STAFF"];

function pickBody(body = {}) {
  const name = (body.name || "").trim();
  const username = (body.username || "").trim();
  const role = body.role === "ADMIN" ? "ADMIN" : "USER";
  const rank = RANKS.includes(body.rank) ? body.rank : "STAFF";
  if (!name) throw new HttpError(400, "กรอกชื่อพนักงาน");
  if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
    throw new HttpError(400, "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลข 3–50 ตัว");
  }
  return { name, username, role, rank, position: body.position?.trim() || null, phone: body.phone?.trim() || null };
}

// GET /api/users
router.get("/", async (req, res) => {
  res.json(await query(`SELECT ${COLS} FROM users ORDER BY role, FIELD(\`rank\`, 'HEAD', 'DEPUTY', 'STAFF'), name`));
});

// POST /api/users  { name, username, password, role, position, phone }
router.post("/", async (req, res) => {
  const data = pickBody(req.body);
  const password = req.body.password || "";
  if (password.length < 6) throw new HttpError(400, "รหัสผ่านต้องมีอย่างน้อย 6 ตัว");
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

// POST /api/users/:id/reset-password  { password }
router.post("/:id/reset-password", async (req, res) => {
  const password = req.body?.password || "";
  if (password.length < 6) throw new HttpError(400, "รหัสผ่านต้องมีอย่างน้อย 6 ตัว");
  const r = await query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(password, 10), req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบพนักงาน");
  res.json({ message: "รีเซ็ตรหัสผ่านแล้ว" });
});

export default router;
