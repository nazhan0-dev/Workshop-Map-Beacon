-- ยกเลิก token เก่าได้ (เปลี่ยนรหัสผ่าน / รีเซ็ตรหัส / ออกจากระบบทุกอุปกรณ์)
-- รันด้วย: npm run db:migrate
USE workshop_map;

ALTER TABLE users
  ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER phone;
