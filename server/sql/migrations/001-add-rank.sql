-- เพิ่มตำแหน่ง หัวหน้า / รองหัวหน้า / เจ้าหน้าที่ ให้ฐานข้อมูลที่สร้างไว้ก่อนแล้ว
-- รันครั้งเดียวใน MySQL Workbench (เปิดไฟล์แล้วกดปุ่มสายฟ้า)
USE workshop_map;

ALTER TABLE users
  ADD COLUMN `rank` ENUM('HEAD','DEPUTY','STAFF') NOT NULL DEFAULT 'STAFF' AFTER role;

-- ตั้งตำแหน่งให้ข้อมูลตัวอย่าง (ข้ามได้ถ้าไม่ได้ใช้ข้อมูลตัวอย่าง)
UPDATE users SET `rank` = 'HEAD'   WHERE username IN ('somchai', 'thana');
UPDATE users SET `rank` = 'DEPUTY' WHERE username IN ('somying', 'prayut');

-- ข้อมูลตัวอย่างเดิมใส่คำว่า หัวหน้าเวร/เจ้าหน้าที่ ไว้ในช่องหน้าที่ ตอนนี้ย้ายไปเป็นตำแหน่งแล้ว จึงล้างออก
UPDATE users SET position = NULL
WHERE role = 'USER' AND position IN ('หัวหน้าเวร', 'รองหัวหน้า', 'เจ้าหน้าที่');
