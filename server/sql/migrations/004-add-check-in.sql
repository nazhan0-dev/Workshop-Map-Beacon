-- เพิ่มระบบเข้ากะ/ออกกะ ให้ฐานข้อมูลที่สร้างไว้ก่อนแล้ว
-- รันครั้งเดียวใน MySQL Workbench (เปิดไฟล์แล้วกดปุ่มสายฟ้า)
USE workshop_map;

ALTER TABLE locations
  ADD COLUMN checkin_radius INT NOT NULL DEFAULT 200 AFTER need_night;   -- ระยะที่กดเข้ากะได้ (เมตร)

ALTER TABLE assignments
  ADD COLUMN check_in_at       DATETIME NULL AFTER acknowledged_at,
  ADD COLUMN check_in_lat      DECIMAL(10,7) NULL AFTER check_in_at,
  ADD COLUMN check_in_lng      DECIMAL(10,7) NULL AFTER check_in_lat,
  ADD COLUMN check_in_distance INT NULL AFTER check_in_lng,
  ADD COLUMN check_in_photo    MEDIUMTEXT NULL AFTER check_in_distance,
  ADD COLUMN check_out_at      DATETIME NULL AFTER check_in_photo;
