import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import Layers from "./Layers";
import { STATUS } from "../../lib/shifts";

const SHIELD =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// หมุด: วงกลมไอคอนโล่ + จุดสีสถานะ + ป้ายจำนวนคน
function pinIcon({ name, status, label, selected }) {
  const color = STATUS[status]?.color || STATUS.none.color;
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div class="pin${selected ? " sel" : ""}">
      <div class="pin-c">${SHIELD}<span class="pin-dot" style="background:${color}"></span></div>
      <div class="pin-l">${selected ? `<b>${esc(name)}</b>` : ""}${label ? `<span><i style="background:${color}"></i>${esc(label)}</span>` : ""}</div>
    </div>`,
  });
}

const meIcon = L.divIcon({ className: "", iconSize: [0, 0], html: '<div class="me-dot"></div>' });

function FitBounds({ points, fitKey }) {
  const map = useMap();
  const done = useRef(null);
  const size = useMapSize();
  useEffect(() => {
    if (!points.length || done.current === fitKey) return;
    map.invalidateSize();
    const size = map.getSize();
    if (size.x < 50 || size.y < 50) return; // ยังไม่มีขนาด รอ resize แล้วค่อย fit
    done.current = fitKey;
    if (points.length === 1) map.setView(points[0], 17);
    else {
      const pad = Math.round(Math.min(70, size.x / 6, size.y / 6));
      map.fitBounds(points, { padding: [pad, pad], maxZoom: 17 });
    }
  }, [points, fitKey, map, size]);
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

function FlyToSelected({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [target, map]);
  return null;
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
 * markers: [{ id, lat, lng, name, status, label }]
 */
export default function MapView({
  markers = [], selectedId, onSelect, picking = false, onPick, me, className = "", fitKey = "init", children,
}) {
  const points = useMemo(() => markers.map((m) => [m.lat, m.lng]), [markers]);
  const selected = markers.find((m) => m.id === selectedId);

  return (
    <MapContainer center={[13.7563, 100.5018]} zoom={13} minZoom={10} zoomControl={false} className={`h-full w-full ${className}`} attributionControl>
      <Layers />
      <FitBounds points={points} fitKey={fitKey} />
      <FlyToSelected target={selected ? [selected.lat, selected.lng] : null} />
      <ClickToPick picking={picking} onPick={onPick} />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]}
          icon={pinIcon({ ...m, selected: m.id === selectedId })}
          zIndexOffset={m.id === selectedId ? 1000 : 0}
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
