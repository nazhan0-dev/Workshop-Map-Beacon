// การยืนยันตัวตน: JWT เก็บใน cookie แบบ httpOnly (JavaScript ในหน้าเว็บอ่านไม่ได้)
// รับ Authorization: Bearer <token> ได้ด้วย สำหรับเครื่องมือหรือแอปอื่นที่ไม่ใช้ cookie
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

export const COOKIE_NAME = "beacon_token";
const SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";

// tv = token_version ของผู้ใช้ ณ ตอนออก token เพิ่มค่าเมื่อเปลี่ยนรหัส/ออกจากทุกอุปกรณ์ -> token เก่าใช้ไม่ได้ทันที
export function signToken(user) {
  return jwt.sign({ id: user.id, tv: user.token_version ?? 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    algorithm: "HS256",
  });
}

export function setAuthCookie(res, user) {
  const token = signToken(user);
  const { exp } = jwt.decode(token);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/api",
    maxAge: exp * 1000 - Date.now(),
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: SECURE, sameSite: "lax", path: "/api" });
}

// อ่าน cookie จาก header (ไม่ต้องพึ่งแพ็กเกจเพิ่ม)
export function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

function tokenFrom(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return { token: header.slice(7), via: "bearer" };
  const c = readCookie(req, COOKIE_NAME);
  return c ? { token: c, via: "cookie" } : { token: null };
}

// ตรวจ token แล้วโหลดผู้ใช้จากฐานข้อมูลทุกครั้ง: ถูกลบ/เปลี่ยนสิทธิ์/เปลี่ยนรหัส มีผลทันที
export async function auth(req, res, next) {
  const { token, via } = tokenFrom(req);
  if (!token) return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ" });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    if (via === "cookie") clearAuthCookie(res);
    return res.status(401).json({ message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
  const [user] = await query("SELECT id, name, role, `rank`, token_version FROM users WHERE id = ?", [payload.id]);
  if (!user || (payload.tv ?? 0) !== user.token_version) {
    if (via === "cookie") clearAuthCookie(res);
    return res.status(401).json({ message: "เซสชันถูกยกเลิก กรุณาเข้าสู่ระบบใหม่" });
  }
  req.user = user;
  req.authVia = via;
  next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ message: "เฉพาะผู้ดูแลระบบ" });
  next();
}
