import { MapPinned } from "lucide-react";

// แผนที่ย่อจากภาพ tile ของ OpenStreetMap (3x3 แผ่น วางให้จุดอยู่กลางกรอบ) ไม่ต้องโหลด Leaflet
const TILE = 256;

export default function MiniMap({ lat, lng, zoom = 16, className = "h-[120px]", pin = true, fade = false }) {
  const n = 2 ** zoom;
  const x = ((Number(lng) + 180) / 360) * n;
  const r = (Number(lat) * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const tx = Math.floor(x), ty = Math.floor(y);
  const px = (x - tx) * TILE, py = (y - ty) * TILE;
  const tiles = [];
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) tiles.push([i, j]);

  return (
    <div className={`relative overflow-hidden bg-[#edefeb] ${className}`} aria-hidden="true">
      <div className="mini-map absolute"
        style={{ left: `calc(50% - ${px + TILE}px)`, top: `calc(50% - ${py + TILE}px)`, width: TILE * 3, height: TILE * 3, transformOrigin: `${px + TILE}px ${py + TILE}px` }}>
        {tiles.map(([i, j]) => (
          <img key={`${i},${j}`} src={`https://tile.openstreetmap.org/${zoom}/${tx + i}/${ty + j}.png`} alt="" loading="lazy" draggable={false}
            className="absolute w-64 h-64 max-w-none select-none" style={{ left: (i + 1) * TILE, top: (j + 1) * TILE }} />
        ))}
      </div>
      {fade && <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />}
      {pin && (
        <span className="mini-pin absolute left-1/2 top-1/2 w-9 h-9 -ml-[18px] -mt-[18px] rounded-full bg-ink text-white flex items-center justify-center shadow-[0_6px_16px_rgb(23_25_28/0.35)] ring-[3px] ring-white">
          <MapPinned size={16} />
        </span>
      )}
    </div>
  );
}
