-- เพิ่มตารางรายงานเหตุการณ์ ให้ฐานข้อมูลที่สร้างไว้ก่อนแล้ว
-- รันครั้งเดียวใน MySQL Workbench (เปิดไฟล์แล้วกดปุ่มสายฟ้า)
USE workshop_map;

-- รายงานเหตุการณ์จาก รปภ.
CREATE TABLE IF NOT EXISTS incidents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,                 -- คนรายงาน
  location_id   INT NOT NULL,
  date          DATE NOT NULL,                -- วันของกะ (กะดึกนับวันที่เริ่มกะ)
  shift         ENUM('MORNING','AFTERNOON','NIGHT') NOT NULL,
  level         ENUM('NORMAL','WARN','URGENT') NOT NULL DEFAULT 'NORMAL', -- ปกติ / ผิดปกติ / ด่วน
  detail        TEXT NOT NULL,
  photo         MEDIUMTEXT NULL,              -- รูปแบบ data URL (ย่อขนาดจากฝั่งเว็บแล้ว)
  status        ENUM('OPEN','ACK','CLOSED') NOT NULL DEFAULT 'OPEN',      -- เปิด / รับเรื่อง / ปิด
  handled_by    INT NULL,                     -- คนรับเรื่องหรือปิดเรื่องล่าสุด
  handled_at    DATETIME NULL,
  close_note    VARCHAR(500) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inc_status (status, created_at),
  KEY idx_inc_slot (date, shift, location_id),
  CONSTRAINT fk_inc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inc_loc  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT fk_inc_by   FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
