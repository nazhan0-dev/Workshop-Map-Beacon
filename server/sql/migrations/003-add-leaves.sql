-- เพิ่มตารางการลา ให้ฐานข้อมูลที่สร้างไว้ก่อนแล้ว
-- รันครั้งเดียวใน MySQL Workbench (เปิดไฟล์แล้วกดปุ่มสายฟ้า)
USE workshop_map;

-- การลาของ รปภ.
CREATE TABLE IF NOT EXISTS leaves (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  type         ENUM('SICK','PERSONAL','VACATION') NOT NULL,    -- ลาป่วย / ลากิจ / ลาพักร้อน
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  shifts       SET('MORNING','AFTERNOON','NIGHT') NULL,        -- NULL = ทั้งวัน
  reason       VARCHAR(1000) NULL,
  photo        MEDIUMTEXT NULL,                                -- ใบรับรองแพทย์ ฯลฯ (data URL)
  status       ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  auto         TINYINT(1) NOT NULL DEFAULT 0,                  -- 1 = ลาป่วยวันนั้น ระบบอนุมัติและถอนเวรให้ทันที
  removed      TEXT NULL,                                      -- เวรที่ถูกถอนออก (JSON) ใช้หาคนแทน
  decided_by   INT NULL,
  decided_at   DATETIME NULL,
  decide_note  VARCHAR(500) NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_leave_user (user_id, start_date),
  KEY idx_leave_status (status, start_date),
  CONSTRAINT fk_leave_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_by   FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
