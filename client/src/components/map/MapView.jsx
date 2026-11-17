import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import Layers from "./Layers";
import { STATUS } from "../../lib/shifts";

const SHIELD =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// หมุด: วงกลมไอคอนโล่ + จุดสีสถานะ + ป้ายจำนวนคน
// เก็บไอคอนไว้ใช้ซ้ำ: ถ้าหน้าตาไม่เปลี่ยน Leaflet จะไม่สร้าง DOM ใหม่ อนิเมชันตอนหล่นจึงเล่นเฉพาะตอนหมุดเปลี่ยนจริง
const iconCache = new Map();
function pinIcon(m) {
  const key = [m.name, m.status, m.label, m.selected ? 1 : 0, m.count, m.need, (m.people || []).join(","), m.alert?.open || 0, m.alert?.urgent || 0].join("|");
  if (!iconCache.has(key)) iconCache.set(key, buildPinIcon(m));
  return iconCache.get(key);
}

// ข้อความสถานะในกล่องที่ขึ้นตอนชี้หมุด
function statusText({ status, count, need }) {
  if (count == null || need == null) return STATUS[status]?.label || "";
  if (status === "none") return "กะนี้ไม่ต้องมีคน";
  if (status === "ok") return `ครบแล้ว · ${count}/${need} คน`;
  if (status === "empty") return `ยังไม่มีคน · ต้องการ ${need} คน`;
  return `ขาดอีก ${need - count} คน · ${count}/${need}`;
}

// กล่องข้อมูลตอนชี้หมุด: ชื่อจุด / สถานะ / คนที่จัดแล้ว
function tipHtml(m, color) {
  const people = m.people || [];
  const names = people.slice(0, 4).map((n) => `<span>${esc(n.split(" ")[0])}</span>`).join("");
  const more = people.length > 4 ? `<span class="more">+${people.length - 4}</span>` : "";
  return `<div class="pin-tip" role="tooltip">
    <b>${esc(m.name)}</b>
    <div class="pin-tip-s"><i style="background:${color}"></i>${esc(statusText(m))}</div>
    ${people.length ? `<div class="pin-tip-p">${names}${more}</div>` : ""}
    ${m.alert ? `<div class="pin-tip-a${m.alert.urgent ? " u" : ""}">มีเหตุการณ์ค้าง ${m.alert.open} เรื่อง${m.alert.urgent ? ` (ด่วน ${m.alert.urgent})` : ""}</div>` : ""}
    <div class="pin-tip-h">คลิกเพื่อดูและจัดคนในจุดนี้</div>
  </div>`;
}

function buildPinIcon(m) {
  const { name, status, label, selected } = m;
  const color = STATUS[status]?.color || STATUS.none.color;
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div class="pin${selected ? " sel" : ""}${status === "empty" ? " warn" : ""}">
      ${selected || !m.people ? "" : tipHtml(m, color)}
      <div class="pin-c">${SHIELD}<span class="pin-dot" style="background:${color}"></span>${m.alert ? `<span class="pin-alert${m.alert.urgent ? " u" : ""}" aria-label="มีเหตุการณ์ค้าง">!</span>` : ""}</div>
      ${selected || label ? `<div class="pin-l">${selected ? `<b>${esc(name)}</b>` : ""}${label ? `<span><i style="background:${color}"></i>${esc(label)}</span>` : ""}</div>` : ""}
    </div>`,
  });
}

const NO_INSETS = { top: 0, bottom: 0 };
const DEFAULT_CENTER = [13.7563, 100.5018]; // กรุงเทพฯ

const meIcon = L.divIcon({ className: "", iconSize: [0, 0], html: '<div class="me-dot"></div>' });

// insets: พื้นที่ที่ถูกของลอยบังด้านบน/ล่าง (px) จะเว้นไว้ไม่ให้หมุดไปอยู่ใต้ของเหล่านั้น
function FitBounds({ points, fitKey, insets }) {
  const map = useMap();
  const done = useRef(null);
  const size = useMapSize();
  useEffect(() => {
    // fitKey="manual" = ผู้ใช้คุมมุมมองเอง ไม่ต้องจัดให้
    if (!points.length || fitKey === "manual" || done.current === fitKey) return;
    map.invalidateSize();
    const size = map.getSize();
    if (size.x < 50 || size.y < 50) return; // ยังไม่มีขนาด รอ resize แล้วค่อย fit
    done.current = fitKey;
    const pad = Math.round(Math.min(60, size.x / 6, size.y / 6));
    const top = Math.min(insets.top, size.y / 4), bottom = Math.min(insets.bottom, size.y / 4);
    map.fitBounds(points.length === 1 ? [points[0], points[0]] : points, {
      paddingTopLeft: [pad, pad + top], paddingBottomRight: [pad, pad + bottom], maxZoom: 17,
      animate: false, // ครั้งแรกไม่ต้องเล่นอนิเมชัน (ถ้าออกจากหน้าระหว่างซูม Leaflet จะ error)
    });
  }, [points, fitKey, map, size, insets]);
  return null;
}

// คอยบอก Leaflet เมื่อกล่องแผนที่เปลี่ยนขนาด (เช่น สลับแท็บ/เปิด modal)
function useMapSize() {
  const map = useMap();
  const [size, setSize] = useState(null);
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      setSize(`${el.clientWidth}x${el.clientHeight}`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return size;
}

// บินไปหาหมุดที่เลือก (ทำเฉพาะตอนพิกัดเปลี่ยน ไม่ใช่ทุกครั้งที่หน้า render)
function FlyToSelected({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [lat, lng, map]);  return null;
}

function ClickToPick({ picking, onPick }) {
  const map = useMapEvents({
    click(e) { if (picking) onPick?.(e.latlng.lat, e.latlng.lng); },
  });
  useEffect(() => {
    map.getContainer().style.cursor = picking ? "crosshair" : "";
  }, [picking, map]);
  return null;
}

/**
 * markers: [{ id, lat, lng, name, status, label, count?, need?, people?, alert?: { open, urgent } }]
 * (count/need/people ใช้แสดงในกล่องข้อมูลตอนชี้หมุด)
 */
export default function MapView({
  markers = [], selectedId, onSelect, picking = false, onPick, me, className = "", fitKey = "init", insets = NO_INSETS,
  center = DEFAULT_CENTER, zoom = 13, children,
}) {
  const points = useMemo(() => markers.map((m) => [m.lat, m.lng]), [markers]);
  const selected = markers.find((m) => m.id === selectedId);

  return (
    <MapContainer center={center} zoom={zoom} minZoom={10} zoomControl={false} className={`h-full w-full ${className}`} attributionControl>
      <Layers />
      <FitBounds points={points} fitKey={fitKey} insets={insets} />
      <FlyToSelected lat={selected?.lat} lng={selected?.lng} />
      <ClickToPick picking={picking} onPick={onPick} />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]}
          icon={pinIcon({ ...m, selected: m.id === selectedId })}
          zIndexOffset={m.id === selectedId ? 1000 : 0} riseOnHover riseOffset={2000}
          eventHandlers={{ click: () => onSelect?.(m.id) }} />
      ))}
      {me && <Marker position={me} icon={meIcon} interactive={false} />}
      {children}
    </MapContainer>
  );
}

// ปุ่มซูมแบบลอย (ใส่เป็น children ของ MapView)
export function ZoomControls({ onLocate }) {
  const map = useMap();
  const btn = "w-10 h-10 flex items-center justify-center text-xl text-ink hover:bg-paper";
  return (
    <MapOverlay className="absolute right-4 bottom-4 z-[500] bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col divide-y divide-line">
      {onLocate && <button className={btn} onClick={onLocate} aria-label="ไปที่ตำแหน่งของฉัน">◎</button>}
      <button className={btn} onClick={() => map.zoomIn()} aria-label="ซูมเข้า">+</button>
      <button className={btn} onClick={() => map.zoomOut()} aria-label="ซูมออก">−</button>
    </MapOverlay>
  );
}

// กล่องลอยบนแผนที่ ที่คลิก/เลื่อนแล้วไม่ไปขยับแผนที่
export function MapOverlay({ className = "", children, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, []);
  return <div ref={ref} className={className} {...props}>{children}</div>;
}
