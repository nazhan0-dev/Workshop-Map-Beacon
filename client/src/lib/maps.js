// ลิงก์เปิดแอปนำทางภายนอก
export const mapsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const wazeUrl = (lat, lng) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
export const appleMapsUrl = (lat, lng) => `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;

export const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

// แอปนำทางที่ให้เลือก (Apple Maps แสดงเฉพาะอุปกรณ์ Apple)
export function navApps(lat, lng) {
  return [
    { key: "google", label: "Google Maps", url: mapsUrl(lat, lng) },
    { key: "waze", label: "Waze", url: wazeUrl(lat, lng) },
    ...(isApple() ? [{ key: "apple", label: "Apple Maps", url: appleMapsUrl(lat, lng) }] : []),
  ];
}

/**
 * หาเส้นทางขับรถจาก a ไป b ด้วย OSRM (เซิร์ฟเวอร์สาธิตสาธารณะ ไม่ต้องใช้ key)
 * a, b: [lat, lng]
 * คืน { points: [[lat, lng], ...], km, min } หรือ throw ถ้าหาไม่ได้
 * หมายเหตุ: ตำแหน่งต้นทาง/ปลายทางถูกส่งไปที่ router.project-osrm.org
 */
export async function fetchRoute(a, b, signal) {
  const url = `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`route ${res.status}`);
  const data = await res.json();
  const r = data.routes?.[0];
  if (data.code !== "Ok" || !r) throw new Error("no route");
  return {
    points: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    km: r.distance / 1000,
    min: Math.max(1, Math.round(r.duration / 60)),
    meters: r.distance,
    seconds: r.duration,
    // คำสั่งเลี้ยวทีละจุด: ที่ loc ให้ทำ type/modifier แล้ววิ่งต่อไปอีก distance เมตร
    steps: (r.legs?.[0]?.steps || []).map((s) => ({
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
      exit: s.maneuver.exit,
      name: s.name || s.ref || "",
      distance: s.distance,
      loc: [s.maneuver.location[1], s.maneuver.location[0]],
    })),
  };
}

// ระยะทางระหว่าง 2 จุด (เมตร)
export function meters(a, b) {
  const R = 6371000, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// แปลงคำสั่งเลี้ยวของ OSRM เป็นภาษาไทย + ชนิดไอคอน
const TURN = {
  left: "เลี้ยวซ้าย", right: "เลี้ยวขวา", "slight left": "เบี่ยงซ้าย", "slight right": "เบี่ยงขวา",
  "sharp left": "เลี้ยวซ้ายหักศอก", "sharp right": "เลี้ยวขวาหักศอก", uturn: "กลับรถ", straight: "ตรงไป",
};
export function instruction(step) {
  if (!step) return { text: "", icon: "straight" };
  const m = step.modifier || "straight";
  const road = step.name ? ` เข้า${step.name}` : "";
  const icon = step.type === "arrive" ? "arrive" : step.type === "depart" ? "depart"
    : step.type === "roundabout" || step.type === "rotary" ? "roundabout" : m;
  switch (step.type) {
    case "depart": return { icon, text: `ออกเดินทาง${step.name ? `ทาง${step.name}` : ""}` };
    case "arrive": return { icon, text: "ถึงจุดเวร" };
    case "roundabout": case "rotary": case "roundabout turn":
      return { icon, text: `เข้าวงเวียน${step.exit ? ` ออกทางที่ ${step.exit}` : ""}${road}` };
    case "merge": return { icon, text: `เบี่ยงเข้าเลน${road}` };
    case "on ramp": return { icon, text: `ขึ้นทางลาด${road}` };
    case "off ramp": return { icon, text: `ลงทางลาด${road}` };
    case "fork": return { icon, text: `ทางแยก ${m.includes("left") ? "ชิดซ้าย" : m.includes("right") ? "ชิดขวา" : "ตรงไป"}${road}` };
    case "end of road": return { icon, text: `สุดถนน ${TURN[m] || "เลี้ยว"}${road}` };
    case "new name": case "continue": return { icon, text: `${m === "straight" ? "ตรงไป" : TURN[m] || "ตรงไป"}${road}` };
    default: return { icon, text: `${TURN[m] || "ตรงไป"}${road}` };
  }
}

export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} ม.` : km < 100 ? `${km.toFixed(1)} กม.` : `${Math.round(km).toLocaleString("th-TH")} กม.`);

// 75 -> "1 ชม. 15 นาที"
export const fmtMin = (min) => {
  if (min < 60) return `${min} นาที`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
};

// ไกลกว่านี้ (ระยะตรง กม.) ไม่ต้องหา/วาดเส้นทางในแอป ให้ใช้แอปนำทางแทน
export const ROUTE_MAX_KM = 30;
