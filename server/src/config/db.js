import mysql from "mysql2/promise";
import "dotenv/config";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "workshop_map",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // คืนค่า DATE เป็น "YYYY-MM-DD" ไม่แปลงเป็น Date (กันปัญหา timezone)
  decimalNumbers: true,
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * ทำหลายคำสั่งเป็นก้อนเดียว (สำเร็จทั้งหมดหรือยกเลิกทั้งหมด)
 * fn ได้ q(sql, params) ที่วิ่งบน connection เดียวกันในทรานแซกชัน
 */
export async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const q = async (sql, params = []) => (await conn.query(sql, params))[0];
    const result = await fn(q);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
