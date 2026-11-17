import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Polyline, useMap } from "react-leaflet";
import {
  ChevronLeft, Navigation, LocateFixed, ExternalLink, Users, AlertCircle, X, Plus, Minus, MapPinned,
  Route, Car, Phone, Sun, Sunset, Moon,
} from "lucide-react";
import useMyShifts from "../../store/useMyShifts";
import MapView, { MapOverlay } from "../../components/map/MapView";
import NavBanner from "../../components/map/NavBanner";
import useTurnByTurn from "../../lib/useTurnByTurn";
import { Segmented, Spinner, Avatar } from "../../components/ui";
import { SHIFT_INFO, today, addDays, fmtShort, currentShift, shiftTiming } from "../../lib/shifts";

const SHIFT_ICON = { MORNING: Sun, AFTERNOON: Sunset, NIGHT: Moon };
import { fetchRoute, navApps, fmtKm, fmtMin, ROUTE_MAX_KM } from "../../lib/maps";

function distanceKm(a, b) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * แผงด้านล่างแบบลากได้: ลากลงเพื่อย่อ (เหลือส่วนหัว) ลากขึ้นเพื่อขยาย แตะส่วนหัวเพื่อสลับ
 * ready: แผงถูก render แล้ว (ใช้วัดความสูง)
 */
function useSheet(ready) {
  const ref = useRef(null);
  const headRef = useRef(null);
  const start = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [drag, setDrag] = useState(null); // ระยะเลื่อนระหว่างลาก (px) หรือ null
  const [range, setRange] = useState(0); // ระยะที่ต้องเลื่อนลงเมื่อย่อ

  useLayoutEffect(() => {
    const el = ref.current, head = headRef.current;
    if (!ready || !el || !head) return;
    const measure = () => setRange(Math.max(0, el.offsetHeight - head.offsetHeight - 16));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const end = (e) => {
    const s = start.current;
    if (!s) return;
    start.current = null;
    const dy = e.clientY - s.y;
    if (Math.abs(dy) < 6) { setCollapsed((c) => !c); setDrag(null); return; } // แตะ = สลับ
    const v = dy / Math.max(1, Date.now() - s.t); // px/ms: ปัดเร็ว ๆ ก็พอ
    setCollapsed(v > 0.5 || (v > -0.5 && s.base + dy > range / 2));
    setDrag(null);
  };

  const handlers = {
    onPointerDown: (e) => {
      start.current = { y: e.clientY, t: Date.now(), base: collapsed ? range : 0 };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e) => {
      const s = start.current;
      if (!s) return;
      setDrag(Math.min(range, Math.max(0, s.base + e.clientY - s.y)));
    },
    onPointerUp: end,
    onPointerCancel: () => { start.current = null; setDrag(null); },
  };

  const y = drag ?? (collapsed ? range : 0);
  const style = {
    transform: `translateY(${y}px)`,
    transition: drag == null ? "transform 0.35s cubic-bezier(.2, .9, .3, 1)" : "none",
  };
  return { sheetRef: ref, headRef, handlers, style, collapsed, toggle: () => setCollapsed((c) => !c) };
}

// เส้นทางบนแผนที่ + จัดมุมมองให้เห็นทั้งเส้น (เว้นที่ให้แผงข้อมูลด้านล่าง)
function RouteLayer({ points, straight, fit = true }) {
  const map = useMap();
  const line = points || straight;
  useEffect(() => {
    if (!fit || !(line?.length > 1)) return;
    // จอกว้าง (แท็บเล็ต): แผงข้อมูลอยู่ซ้ายล่าง / มือถือ: แผงอยู่ด้านล่างเต็มกว้าง
    const wide = map.getSize().x >= 700;
    map.fitBounds(line, {
      paddingTopLeft: wide ? [440, 90] : [40, 90], paddingBottomRight: wide ? [60, 60] : [40, 290], maxZoom: 17, animate: false,
    });
  }, [line, map, fit]);
  if (points) {
    return (
      <>
        <Polyline positions={points} pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
        <Polyline positions={points} pathOptions={{ color: "#2e9e68", weight: 5, lineCap: "round", lineJoin: "round", className: "route-line" }} />
      </>
    );
  }
  if (straight) return <Polyline positions={straight} pathOptions={{ color: "#17191c", weight: 3, dashArray: "2 9", lineCap: "round", opacity: 0.7 }} />;
  return null;
}

// ระหว่างนำทาง: แผนที่เลื่อนตามตำแหน่งของเรา (เลื่อนให้เราอยู่ค่อนลงด้านล่าง เห็นทางข้างหน้ามากขึ้น)
function NavFollow({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (!pos) return;
    const z = Math.max(map.getZoom(), 17);
    const p = map.project(pos, z).subtract([0, map.getSize().y * 0.18]);
    map.setView(map.unproject(p, z), z, { animate: true, duration: 0.6 });
  }, [pos, map]);
  return null;
}

// ปุ่มควบคุมแผนที่ด้านขวา: ตำแหน่งของฉัน / ไปที่จุดเวร / ซูม
function MapControls({ me, dest, geo, onLocate }) {
  const map = useMap();
  const btn = "w-11 h-11 flex items-center justify-center text-ink hover:bg-paper active:bg-track transition-colors";
  return (
    <MapOverlay className="map-float absolute top-4 right-4 z-[500] flex flex-col gap-2">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-[0_8px_24px_-8px_rgb(23_25_28/0.3)] overflow-hidden flex flex-col divide-y divide-line">
        <button className={`${btn} text-me`} aria-label="ตำแหน่งของฉัน" title="ตำแหน่งของฉัน"
          onClick={() => { if (me) map.flyTo(me, Math.max(map.getZoom(), 16), { duration: 0.6 }); onLocate(); }}>
          {geo === "asking" ? <Spinner className="w-[18px] h-[18px]" /> : <LocateFixed size={19} />}
        </button>
        {dest && (
          <button className={btn} aria-label="ไปที่จุดเวร" title="ไปที่จุดเวร" onClick={() => map.flyTo(dest, 17, { duration: 0.6 })}>
            <MapPinned size={18} />
          </button>
        )}
      </div>
      <div className="hidden md:flex bg-white/95 backdrop-blur rounded-2xl shadow-[0_8px_24px_-8px_rgb(23_25_28/0.3)] overflow-hidden flex-col divide-y divide-line">
        <button className={btn} aria-label="ซูมเข้า" onClick={() => map.zoomIn()}><Plus size={18} /></button>
        <button className={btn} aria-label="ซูมออก" onClick={() => map.zoomOut()}><Minus size={18} /></button>
      </div>
    </MapOverlay>
  );
}

const clock = (secFromNow) => new Date(Date.now() + secFromNow * 1000).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

export default function MyMapPage() {
  const { items, load } = useMyShifts();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [day, setDay] = useState("today");
  const [me, setMe] = useState(null);
  const [geo, setGeo] = useState("asking"); // asking | ok | denied
  const [routeRes, setRouteRes] = useState({ key: null, route: null }); // ผลเส้นทางล่าสุด (route=null คือหาไม่ได้)
  const [pickApp, setPickApp] = useState(false);
  const { sheetRef, headRef, handlers: sheetHandlers, style: sheetStyle, collapsed, toggle: toggleSheet } = useSheet(Boolean(items));

  useEffect(() => { if (!items) load(); }, [items, load]);

  // ขอตำแหน่ง: อัปเดต state เฉพาะใน callback
  const requestLocation = () => {
    if (!navigator.geolocation) { Promise.resolve().then(() => setGeo("denied")); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe([p.coords.latitude, p.coords.longitude]); setGeo("ok"); },
      () => setGeo("denied"),
      { timeout: 10000, enableHighAccuracy: true },
    );
  };
  const locate = () => { setGeo("asking"); requestLocation(); };
  useEffect(() => { requestLocation(); }, []);

  const byId = items?.find((i) => i.id === Number(params.get("id")));
  const target = byId || currentShift(items, day === "today" ? today() : addDays(today(), 1));
  const dest = target ? [Number(target.lat), Number(target.lng)] : null;

  // หาเส้นทางเมื่อรู้ทั้งตำแหน่งเราและจุดเวร (สถานะคำนวณจากผลล่าสุด ไม่ต้องตั้งใน effect)
  const meKey = me?.join(","), destKey = dest?.join(",");
  const straightKm = me && dest ? distanceKm(me, dest) : null;
  const far = straightKm != null && straightKm > ROUTE_MAX_KM; // อยู่ไกลมาก: ไม่วาดเส้นทาง โฟกัสที่จุดเวรแทน
  const routeKey = me && dest && !far ? `${meKey}>${destKey}` : null;
  useEffect(() => {
    if (!routeKey) return;
    const [a, b] = routeKey.split(">").map((s) => s.split(",").map(Number));
    const ctl = new AbortController();
    fetchRoute(a, b, ctl.signal)
      .then((r) => setRouteRes({ key: routeKey, route: r }))
      .catch((e) => { if (e.name !== "AbortError") setRouteRes({ key: routeKey, route: null }); });
    return () => ctl.abort();
  }, [routeKey]);
  const routeState = !routeKey ? "idle" : routeRes.key !== routeKey ? "loading" : routeRes.route ? "ok" : "failed";
  const route = routeState === "ok" ? routeRes.route : null;

  const mates = target?.teammates?.map((t) => t.name).join(", ");
  const apps = dest ? navApps(dest[0], dest[1]) : [];

  // โหมดนำทางในแอป
  const { active: navOn, start: startNav, stop: stopNav, pos: navPos, route: navRoute, step: navStep,
    toNext, remainM, remainS, arrived, error: navError, rerouting } = useTurnByTurn(dest);
  const shownRoute = navOn ? navRoute?.points : route?.points;

  return (
    <div className="relative flex-1 min-h-[calc(100dvh-84px)] md:min-h-0 md:h-[calc(100dvh-32px)] md:rounded-3xl md:overflow-hidden md:surface">
      <div className="absolute inset-0">
        {!items ? <div className="h-full flex items-center justify-center"><Spinner /></div> : (
          <MapView fitKey={target ? `t${target.id}` : "none"} me={navOn ? navPos || me : me}
            markers={target ? [{ id: target.id, lat: target.lat, lng: target.lng, name: target.location_name,
              status: "ok", label: `${(target.teammates?.length || 0) + 1} คน` }] : []}
            selectedId={target?.id}>
            <RouteLayer points={shownRoute} fit={!navOn}
              straight={!navOn && routeState === "failed" && me && dest ? [me, dest] : null} />
            {navOn && <NavFollow pos={navPos} />}
            {navOn ? (
              <MapOverlay className="absolute top-4 inset-x-4 md:right-auto md:w-[400px] z-[500]">
                <NavBanner step={navStep} toNext={toNext} arrived={arrived} rerouting={rerouting} error={navError} name={target?.location_name} />
              </MapOverlay>
            ) : (
            <MapOverlay className="map-float absolute top-4 left-4 right-[76px] md:right-auto md:w-[340px] z-[500] flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-2xl p-1.5 shadow-[0_8px_24px_-8px_rgb(23_25_28/0.3)]">
              <button onClick={() => navigate("/me")} aria-label="กลับ" className="w-10 h-10 shrink-0 rounded-xl hover:bg-paper flex items-center justify-center"><ChevronLeft size={20} /></button>
              {byId ? (
                <span className="flex-1 min-w-0 text-sm font-semibold truncate pr-2">{target ? `${fmtShort(target.date)} · กะ${SHIFT_INFO[target.shift].label}` : "เวรของฉัน"}</span>
              ) : (
                <Segmented className="flex-1" value={day} onChange={setDay}
                  options={[{ value: "today", label: "วันนี้" }, { value: "tomorrow", label: "พรุ่งนี้" }]} />
              )}
            </MapOverlay>
            )}
            {!navOn && <MapControls me={me} dest={dest} geo={geo} onLocate={locate} />}
          </MapView>
        )}
      </div>

      {/* แถบล่างระหว่างนำทาง */}
      {navOn && (
        <div className="sheet-up absolute inset-x-0 bottom-0 md:left-4 md:right-auto md:bottom-4 md:w-[400px] md:rounded-3xl z-[600] bg-white rounded-t-3xl shadow-[0_-6px_24px_rgb(23_25_28/0.1)] md:shadow-[0_16px_40px_-12px_rgb(23_25_28/0.35)] px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {arrived ? (
                <>
                  <div className="text-[22px] font-bold text-brand leading-tight">ถึงแล้ว</div>
                  <div className="text-sm text-mute truncate">{target?.location_name}</div>
                </>
              ) : remainS != null ? (
                <>
                  <div className="text-[22px] font-bold leading-tight tabular-nums">{fmtMin(Math.max(1, Math.round(remainS / 60)))}</div>
                  <div className="text-sm text-mute tabular-nums">{fmtKm(remainM / 1000)} · ถึงประมาณ {clock(remainS)} น.</div>
                </>
              ) : (
                <div className="space-y-1.5"><div className="h-5 w-24 rounded skeleton bg-paper" /><div className="h-3.5 w-40 rounded skeleton bg-paper" /></div>
              )}
            </div>
            <a href={apps[0]?.url} target="_blank" rel="noreferrer" aria-label="เปิดใน Google Maps" title="เปิดใน Google Maps"
              className="w-12 h-12 rounded-2xl bg-paper hover:bg-track flex items-center justify-center text-mute"><ExternalLink size={18} /></a>
            <button onClick={stopNav}
              className={`h-12 px-5 rounded-2xl font-semibold transition ${arrived ? "bg-brand text-white hover:brightness-95" : "bg-danger-soft text-danger hover:bg-danger hover:text-white"}`}>
              {arrived ? "เสร็จสิ้น" : "หยุด"}
            </button>
          </div>
        </div>
      )}

      {items && !navOn && (
        <div ref={sheetRef} className="sheet-up absolute inset-x-0 bottom-0 md:left-4 md:right-auto md:bottom-4 md:w-[400px] md:rounded-3xl z-[600] bg-white rounded-t-3xl shadow-[0_-6px_24px_rgb(23_25_28/0.08)] md:shadow-[0_16px_40px_-12px_rgb(23_25_28/0.35)] px-5 pb-5"
          style={sheetStyle}>
          {/* ส่วนหัว: ลากขึ้น/ลง หรือแตะ เพื่อย่อ/ขยายแผง */}
          <div ref={headRef} {...sheetHandlers} role="button" tabIndex={0} aria-expanded={!collapsed}
            aria-label={collapsed ? "ขยายรายละเอียด" : "ย่อรายละเอียด"}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggleSheet())}
            className="-mx-5 px-5 pb-1 cursor-grab active:cursor-grabbing touch-none select-none">
            <div className={`h-1 rounded mx-auto my-2.5 transition-all duration-300 ${collapsed ? "w-12 bg-ink/30" : "w-9 bg-line"}`} />
            {target ? (() => {
              const ShiftIcon = SHIFT_ICON[target.shift];
              const t = shiftTiming(target);
              const live = t.text === "กำลังเข้าเวร";
              return (
                <div className="flex items-center gap-3 mt-1">
                  <span className="w-11 h-11 rounded-xl bg-ink text-white flex items-center justify-center shrink-0"><ShiftIcon size={20} /></span>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-[18px] font-semibold leading-tight truncate">{target.location_name}</h1>
                    <p className="text-[13px] text-mute leading-snug">{fmtShort(target.date)} · กะ{SHIFT_INFO[target.shift].label} <span className="whitespace-nowrap">{SHIFT_INFO[target.shift].time}</span></p>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-1
                    ${live ? "bg-brand-soft text-brand" : t.ended ? "bg-paper text-mute" : "bg-warn-soft text-warn"}`}>
                    {live && <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />}{t.text}
                  </span>
                </div>
              );
            })() : null}
          </div>
          {target ? (
            <>
              {/* ระยะทาง / เวลา */}
              <div className="mt-3.5 rounded-2xl bg-paper px-4 py-3 flex items-center min-h-[64px]">
                {routeState === "ok" && route && geo !== "denied" && !far ? (
                  <div key={destKey} className="pop-in flex-1 grid grid-cols-2 divide-x divide-line">
                    <div className="pr-3">
                      <div className="text-[11px] text-mute flex items-center gap-1"><Route size={12} />ห่างจากจุดเวร</div>
                      <div className="text-[19px] font-bold leading-tight tabular-nums mt-0.5">{fmtKm(route.km)}</div>
                    </div>
                    <div className="pl-3">
                      <div className="text-[11px] text-mute flex items-center gap-1"><Car size={12} />ขับรถประมาณ</div>
                      <div className="text-[19px] font-bold leading-tight tabular-nums mt-0.5">{fmtMin(route.min)}</div>
                    </div>
                  </div>
                ) : geo === "denied" ? (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">ไม่ทราบตำแหน่งของคุณ</div>
                    <button onClick={locate} className="text-xs font-semibold text-brand">เปิดตำแหน่งเพื่อดูเส้นทาง</button>
                  </div>
                ) : far ? (
                  <div key={`far-${destKey}`} className="pop-in flex-1 min-w-0">
                    <div className="text-[17px] font-bold leading-tight">ห่างจากจุดเวร ~{fmtKm(straightKm)}</div>
                    <div className="text-xs text-mute">คุณอยู่ไกลจากจุดเวร ใช้แอปนำทางเพื่อดูเส้นทาง</div>
                  </div>
                ) : routeState === "failed" ? (
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-bold leading-tight">{straightKm != null ? `ห่างจากจุดเวร ~${fmtKm(straightKm)}` : "-"}</div>
                    <div className="flex items-center gap-1 text-xs text-mute"><AlertCircle size={12} />หาเส้นทางไม่ได้ตอนนี้ ใช้แอปนำทางแทนได้</div>
                  </div>
                ) : (
                  <div className="flex-1 space-y-1.5" aria-label="กำลังหาเส้นทาง">
                    <div className="h-4 w-32 rounded skeleton bg-white" />
                    <div className="h-3 w-44 rounded skeleton bg-white" />
                  </div>
                )}
              </div>

              {/* เพื่อนร่วมกะ + โทรหัวหน้าจุด */}
              <div className="flex items-center gap-2.5 mt-3 mb-4">
                {target.teammates?.length ? (
                  <span className="flex shrink-0">
                    {target.teammates.slice(0, 3).map((t, i) => (
                      <span key={t.id} className={`rounded-full ring-2 ring-white ${i ? "-ml-2" : ""}`}><Avatar name={t.name} size={28} title={t.name} /></span>
                    ))}
                  </span>
                ) : <span className="w-7 h-7 rounded-full bg-paper flex items-center justify-center text-mute shrink-0"><Users size={14} /></span>}
                <span className="flex-1 min-w-0 text-xs text-mute truncate">{mates ? `เข้าเวรกับ ${mates}` : "ประจำจุดนี้คนเดียว"}</span>
                {target.contact_phone && (
                  <a href={`tel:${target.contact_phone}`} title={`หัวหน้าจุด ${target.contact_phone}`}
                    className="shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-brand-soft text-brand text-xs font-semibold hover:bg-brand hover:text-white transition-colors">
                    <Phone size={13} />หัวหน้าจุด
                  </a>
                )}
              </div>

              {/* ปุ่มหลัก: นำทางบนแผนที่ของแอป / ปุ่มรอง: เปิดแอปนำทางอื่น */}
              <button onClick={() => { setPickApp(false); startNav(); }}
                className="group w-full h-[52px] rounded-2xl bg-ink text-white font-semibold flex items-center justify-center gap-2 hover:bg-black active:scale-[0.99] transition">
                <Navigation size={17} className="transition-transform group-hover:rotate-12" />เริ่มนำทาง
              </button>
              {!pickApp ? (
                <button onClick={() => setPickApp(true)} className="w-full mt-2 text-xs font-semibold text-mute hover:text-ink py-1">
                  หรือเปิดด้วยแอปอื่น (Google Maps, Waze)
                </button>
              ) : (
                <div className="expand-in mt-2.5">
                  <div className="flex items-center mb-1.5">
                    <span className="text-xs font-semibold text-mute flex-1">เปิดด้วยแอปอื่น</span>
                    <button onClick={() => setPickApp(false)} aria-label="ปิด" className="w-6 h-6 rounded-lg hover:bg-paper flex items-center justify-center text-mute"><X size={14} /></button>
                  </div>
                  <div className={`grid gap-2 ${apps.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                    {apps.map((a, i) => (
                      <a key={a.key} href={a.url} target="_blank" rel="noreferrer" style={{ animationDelay: `${i * 0.05}s` }}
                        className="chip-in h-10 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 bg-paper hover:bg-track transition">
                        {a.label}<ExternalLink size={12} className="opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-mute">{day === "today" ? "วันนี้" : "พรุ่งนี้"}ไม่มีเวร</p>
          )}
        </div>
      )}
    </div>
  );
}
