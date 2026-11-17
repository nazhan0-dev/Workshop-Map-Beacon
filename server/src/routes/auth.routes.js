import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { auth, signToken } from "../middlewares/auth.js";
import { HttpError } from "../middlewares/error.js";

const router = Router();
const PUBLIC_COLS = "id, name, username, role, `rank`, position, phone";

// POST /api/auth/login  { username, password }
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) throw new HttpError(400, "กรอกชื่อผู้ใช้และรหัสผ่าน");

  const [user] = await query("SELECT * FROM users WHERE username = ?", [username.trim()]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
  const { password_hash, ...safe } = user;
  res.json({ token: signToken(user), user: safe });
});

// GET /api/auth/me
router.get("/me", auth, async (req, res) => {
  const [user] = await query(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`, [req.user.id]);
  if (!user) throw new HttpError(401, "ไม่พบบัญชีผู้ใช้");
  res.json(user);
});

// PUT /api/auth/password  { currentPassword, newPassword }
router.put("/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) throw new HttpError(400, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว");

  const [user] = await query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
  if (!user || !(await bcrypt.compare(currentPassword || "", user.password_hash))) {
    throw new HttpError(400, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
  }
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(newPassword, 10), req.user.id]);
  res.json({ message: "เปลี่ยนรหัสผ่านแล้ว" });
});

export default router;
