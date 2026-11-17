// โลโก้ Beacon: วงแหวน + จุดกลาง (เป้าหมาย/จุดเวร) ล้อมด้วยเส้นโค้งสีเขียว (สัญญาณ/การดูแล)
// tone="light"   ใช้บนพื้นสว่าง (วงดำ เส้นโค้งเขียว)
// tone="onBrand" ใช้บนพื้นเขียว/เข้ม (วงขาว เส้นโค้งขาวโปร่ง)
// beams=false    ตัดเส้นโค้งด้านนอกออก ใช้ตอนขนาดเล็กมาก
// spin           ให้เส้นโค้งหมุนช้า ๆ (ใช้ตอนโหลด/หน้าเข้าสู่ระบบ)
export function BeaconMark({ size = 40, tone = "light", beams = true, spin = false, className = "" }) {
  const c = tone === "onBrand"
    ? { core: "#FFFFFF", arc: "rgba(255,255,255,0.75)" }
    : { core: "#17191C", arc: "#2E9E68" };

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Beacon">
      {beams && (
        // เส้นโค้งรัศมี 26 เว้นช่องที่มุมซ้ายบน (จาก -140° ถึง -75°)
        <path d="M38.73 6.89 A26 26 0 1 1 12.08 15.29" fill="none" stroke={c.arc} strokeWidth="5.5" strokeLinecap="round"
          className={spin ? "logo-spin" : undefined} style={spin ? { transformOrigin: "32px 32px" } : undefined} />
      )}
      <circle cx="32" cy="32" r="13.5" fill="none" stroke={c.core} strokeWidth="5.5" />
      <circle cx="32" cy="32" r="5.5" fill={c.core} />
    </svg>
  );
}

// ไอคอนแอป: สี่เหลี่ยมมนสีเทาอ่อน + โลโก้
export function BeaconAppIcon({ size = 44, radius = 14 }) {
  return (
    <span className="inline-flex items-center justify-center bg-track shrink-0" style={{ width: size, height: size, borderRadius: radius }}>
      <BeaconMark size={Math.round(size * 0.68)} beams={size >= 24} />
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
