// เข้าสู่ระบบ / ออกจากระบบ / ข้อมูลของฉัน / เปลี่ยนรหัสผ่าน
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { auth, setAuthCookie, clearAuthCookie } from "../middlewares/auth.js";
import { loginLimiter } from "../middlewares/security.js";
import { HttpError } from "../middlewares/error.js";

const router = Router();
const PUBLIC_COLS = "id, name, username, role, `rank`, position, phone";
// ใช้เทียบเมื่อไม่พบชื่อผู้ใช้ ให้เวลาตอบเท่ากับกรณีรหัสผิด (กันเดาว่าชื่อผู้ใช้ไหนมีอยู่จริง)
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// POST /api/auth/login  { username, password }  -> ตั้ง cookie แล้วส่งข้อมูลผู้ใช้กลับ (ไม่ส่ง token ใน body)
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    throw new HttpError(400, "กรอกชื่อผู้ใช้และรหัสผ่าน");
  }
  const name = username.trim().toLowerCase().slice(0, 50);
  const wait = loginLimiter.check(req.ip, name);
  if (wait) {
    res.set("Retry-After", String(wait));
    throw new HttpError(429, `ใส่รหัสผิดหลายครั้ง ลองใหม่ในอีก ${Math.ceil(wait / 60)} นาที`, { code: "TOO_MANY_ATTEMPTS" });
  }

  const [user] = await query("SELECT * FROM users WHERE username = ?", [name]);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    loginLimiter.fail(req.ip, name);
    throw new HttpError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
  loginLimiter.success(req.ip, name);
  setAuthCookie(res, user);
  const [safe] = await query(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`, [user.id]);
  res.json({ user: safe });
});

// POST /api/auth/logout  ลบ cookie ในเครื่องนี้
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "ออกจากระบบแล้ว" });
});

// POST /api/auth/logout-all  ออกจากระบบทุกอุปกรณ์ (token ที่ออกไปแล้วใช้ไม่ได้ทั้งหมด)
router.post("/logout-all", auth, async (req, res) => {
  await query("UPDATE users SET token_version = token_version + 1 WHERE id = ?", [req.user.id]);
  clearAuthCookie(res);
  res.json({ message: "ออกจากระบบทุกอุปกรณ์แล้ว" });
});

// GET /api/auth/me
router.get("/me", auth, async (req, res) => {
  const [user] = await query(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`, [req.user.id]);
  res.json(user);
});

// PUT /api/auth/password  { currentPassword, newPassword }
// เปลี่ยนแล้วอุปกรณ์อื่นถูกออกจากระบบ ส่วนเครื่องนี้ได้ cookie ใหม่
router.put("/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 6) throw new HttpError(400, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว");
  if (newPassword.length > 72) throw new HttpError(400, "รหัสผ่านยาวได้ไม่เกิน 72 ตัว");

  const [user] = await query("SELECT id, password_hash FROM users WHERE id = ?", [req.user.id]);
  if (!(await bcrypt.compare(String(currentPassword || ""), user.password_hash))) {
    throw new HttpError(400, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
  }
  await query(
    "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
    [await bcrypt.hash(newPassword, 10), req.user.id]
  );
  const [fresh] = await query("SELECT id, token_version FROM users WHERE id = ?", [req.user.id]);
  setAuthCookie(res, fresh);
  res.json({ message: "เปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นจะต้องเข้าสู่ระบบใหม่" });
});

export default router;
