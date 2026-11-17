// สีประจำตัวของแต่ละคนสำหรับรูปโปรไฟล์ เลือกจากชื่อ (คนเดิมได้สีเดิมเสมอ ทุกหน้า)
const AVATAR_TONES = [
  "bg-[#e5f4ec] text-[#1f7a4f]", "bg-[#e8eefc] text-[#2f55b5]", "bg-[#fbf1e3] text-[#a0621a]",
  "bg-[#f4e9fb] text-[#7a3fa3]", "bg-[#fbeae8] text-[#b23b32]", "bg-[#e6f5f6] text-[#1f7680]",
];

export const avatarTone = (name = "") =>
  AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
