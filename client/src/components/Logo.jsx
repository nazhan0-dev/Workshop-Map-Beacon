// โลโก้ Beacon (ประภาคาร)
// tone="light"  ใช้บนพื้นขาว   (ตัวดำ ไฟเขียว)
// tone="onBrand" ใช้บนพื้นเขียว (ตัวขาว ไฟดำ)
// beams=false  ตัดลำแสงออก ใช้ตอนขนาดเล็กกว่า 32px
export function BeaconMark({ size = 40, tone = "light", beams = true, className = "" }) {
  const c =
    tone === "onBrand"
      ? { body: "#FFFFFF", lamp: "#17191C", beam: "#FFFFFF", band: "#2E9E68" }
      : { body: "#17191C", lamp: "#2E9E68", beam: "#2E9E68", band: "#FFFFFF" };

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Beacon">
      {beams && (
        <>
          <polygon points="37,19 62,11 62,29" fill={c.beam} opacity="0.45" />
          <polygon points="27,19 2,11 2,29" fill={c.beam} opacity="0.45" />
        </>
      )}
      <polygon points="25,16 39,16 32,8" fill={c.body} />
      <rect x="27" y="16" width="10" height="8" rx="1.5" fill={c.lamp} />
      <polygon points="28,25 36,25 39,56 25,56" fill={c.body} />
      <rect x="25.5" y="36" width="13" height="4" fill={c.band} />
      <rect x="18" y="56" width="28" height="4" rx="2" fill={c.body} />
    </svg>
  );
}

// ไอคอนแอป: สี่เหลี่ยมมนสีเขียว + ประภาคารสีขาว
export function BeaconAppIcon({ size = 44, radius = 14 }) {
  return (
    <span className="inline-flex items-center justify-center bg-brand shrink-0" style={{ width: size, height: size, borderRadius: radius }}>
      <BeaconMark size={Math.round(size * 0.72)} tone="onBrand" beams={size >= 40} />
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
