// เก็บสิ่งที่กำลังลากอยู่ (ระหว่างลาก เบราว์เซอร์ไม่ให้อ่าน dataTransfer)
// item: { kind: "user", userId, name } หรือ { kind: "asg", id, name, locationId }
let current = null;

export const drag = {
  start(e, item) {
    current = item;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.name);
  },
  end() { current = null; },
  get: () => current,
};
