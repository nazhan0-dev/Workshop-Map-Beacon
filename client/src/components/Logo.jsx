import { useId } from "react";

// โลโก้ Beacon (ประภาคาร)
// tone="light"  ใช้บนพื้นขาว   (ตัวดำ ไฟเขียว)
// tone="onBrand" ใช้บนพื้นเขียว/เข้ม (ตัวขาว ไฟเขียวอ่อน)
// beams=false  ตัดลำแสงออก ใช้ตอนขนาดเล็กกว่า 32px
export function BeaconMark({ size = 40, tone = "light", beams = true, className = "" }) {
  const id = useId().replace(/:/g, "");
  const c =
    tone === "onBrand"
      ? { body: "#FFFFFF", lamp: "#CFF5E0", beam: "#FFFFFF", band: "#2E9E68", glass: "#2E9E68" }
      : { body: "#17191C", lamp: "#3EC482", beam: "#2E9E68", band: "#FFFFFF", glass: "#17191C" };

  // ตัวหอทรงสอบ: กว้างบน 9 ล่าง 16
  const tower = "M27.6 24.5 H36.4 L39.6 54 H24.4 Z";

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Beacon">
      <defs>
        <linearGradient id={`${id}r`} x1="0" x2="1">
          <stop offset="0" stopColor={c.beam} stopOpacity="0.55" />
          <stop offset="1" stopColor={c.beam} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="1" x2="0">
          <stop offset="0" stopColor={c.beam} stopOpacity="0.55" />
          <stop offset="1" stopColor={c.beam} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={c.lamp} stopOpacity="0.55" />
          <stop offset="1" stopColor={c.lamp} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}t`}><path d={tower} /></clipPath>
      </defs>

      {beams && (
        <>
          <circle cx="32" cy="17.5" r="12" fill={`url(#${id}g)`} />
          <path d="M37 15.2 L63 9 V26 L37 19.8 Z" fill={`url(#${id}r)`} />
          <path d="M27 15.2 L1 9 V26 L27 19.8 Z" fill={`url(#${id}l)`} />
        </>
      )}

      {/* ยอดโดม + เสาแหลม */}
      <circle cx="32" cy="5.2" r="1.3" fill={c.body} />
      <path d="M25.6 12.6 C25.6 8.6 28.4 6.4 32 6.4 C35.6 6.4 38.4 8.6 38.4 12.6 Z" fill={c.body} />

      {/* ห้องตะเกียง: กระจกเรืองแสง + โครงหน้าต่าง */}
      <rect x="26.8" y="12.6" width="10.4" height="8.6" rx="0.8" fill={c.body} />
      <rect x="28.1" y="13.8" width="7.8" height="6.2" rx="0.6" fill={c.lamp} />
      <rect x="31.4" y="13.8" width="1.2" height="6.2" fill={c.glass} opacity="0.35" />

      {/* ระเบียงรอบห้องตะเกียง */}
      <rect x="23.8" y="21.2" width="16.4" height="2.6" rx="1.3" fill={c.body} />

      {/* ตัวหอ + แถบคาด 2 แถบ */}
      <path d={tower} fill={c.body} />
      <g clipPath={`url(#${id}t)`} fill={c.band}>
        <rect x="20" y="31" width="24" height="4.2" />
        <rect x="20" y="42" width="24" height="4.2" />
      </g>

      {/* ประตูโค้ง */}
      <path d="M30.2 54 V50.6 A1.8 1.8 0 0 1 33.8 50.6 V54 Z" fill={c.band} />

      {/* ฐาน */}
      <rect x="19" y="54" width="26" height="4.4" rx="2.2" fill={c.body} />
    </svg>
  );
}

// ไอคอนแอป: สี่เหลี่ยมมนสีเทาอ่อน + ประภาคารสีเข้ม ไฟเขียว
export function BeaconAppIcon({ size = 44, radius = 14 }) {
  return (
    <span className="inline-flex items-center justify-center bg-track shrink-0" style={{ width: size, height: size, borderRadius: radius }}>
      <BeaconMark size={Math.round(size * 0.72)} beams={size >= 40} />
    </span>
  );
}

// โลโก้ + ชื่อ
export function BeaconLogo({ size = 40 }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BeaconMark size={size} />
      <span className="font-brand font-bold tracking-tight" style={{ fontSize: size * 0.62 }}>Beacon</span>
    </span>
  );
}
