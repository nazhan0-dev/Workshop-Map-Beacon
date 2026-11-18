// สร้าง error ที่มี status code เพื่อโยนจาก route
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function notFound(req, res) {
  res.status(404).json({ message: `ไม่พบ ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง" });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "ไฟล์ใหญ่เกินไป" });
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "ข้อมูลซ้ำกับที่มีอยู่แล้ว" });
  if (err.code === "ER_DATA_TOO_LONG") return res.status(400).json({ message: "ข้อความยาวเกินกำหนด" });
  if (err.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ message: "ข้อมูลที่อ้างถึงไม่มีอยู่" });
  console.error(err);
  res.status(500).json({ message: "เซิร์ฟเวอร์มีปัญหา ลองใหม่อีกครั้ง" });
}
