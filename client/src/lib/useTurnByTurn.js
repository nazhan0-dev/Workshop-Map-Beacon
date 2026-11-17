// นำทางทีละเลี้ยวบนแผนที่ของแอป: ติดตามตำแหน่งสด, ขยับคำสั่งเลี้ยว, หาเส้นทางใหม่เมื่อออกนอกเส้นทาง
import { useEffect, useRef, useState } from "react";
import { fetchRoute, meters } from "./maps";

const PASS_M = 25;       // เข้าใกล้จุดเลี้ยวไม่เกินนี้ = ผ่านจุดนั้นแล้ว
const OFF_ROUTE_M = 60;  // ห่างจากเส้นทางเกินนี้ = ออกนอกเส้นทาง
const REROUTE_MS = 10000; // หาเส้นทางใหม่ได้ไม่บ่อยกว่านี้
const ARRIVE_M = 40;     // ใกล้จุดเวรไม่เกินนี้ = ถึงแล้ว

const distToLine = (p, pts) => pts.reduce((m, q) => Math.min(m, meters(p, q)), Infinity);

export default function useTurnByTurn(dest) {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState(null);
  const [route, setRoute] = useState(null);
  const [k, setK] = useState(1); // คำสั่งเลี้ยวถัดไป (0 = จุดออกเดินทาง)
  const [error, setError] = useState("");
  const [rerouting, setRerouting] = useState(false);

  const watchId = useRef(null);
  const wake = useRef(null);
  const routeRef = useRef(null);
  const kRef = useRef(1);
  const lastFetch = useRef(0);
  const destRef = useRef(null); // ตั้งตอนเริ่มนำทาง

  const loadRoute = (from) => {
    lastFetch.current = Date.now();
    setRerouting(true);
    fetchRoute(from, destRef.current)
      .then((r) => { routeRef.current = r; kRef.current = 1; setRoute(r); setK(1); setError(""); })
      .catch(() => setError("หาเส้นทางไม่ได้ ลองใหม่อีกครั้ง"))
      .finally(() => setRerouting(false));
  };

  // ทุกครั้งที่ได้ตำแหน่งใหม่
  const onPos = (p) => {
    const here = [p.coords.latitude, p.coords.longitude];
    setPos(here);
    const r = routeRef.current;
    if (!r) { if (Date.now() - lastFetch.current > 3000) loadRoute(here); return; }
    // ขยับไปคำสั่งถัดไปเมื่อผ่านจุดเลี้ยว (หรือจุดถัดไปใกล้กว่าแล้ว)
    let i = kRef.current;
    while (i < r.steps.length - 1 && (meters(here, r.steps[i].loc) < PASS_M || meters(here, r.steps[i + 1].loc) < meters(here, r.steps[i].loc))) i++;
    if (i !== kRef.current) { kRef.current = i; setK(i); }
    // ออกนอกเส้นทาง -> หาใหม่
    if (distToLine(here, r.points) > OFF_ROUTE_M && Date.now() - lastFetch.current > REROUTE_MS) loadRoute(here);
  };

  const start = () => {
    if (!navigator.geolocation) { setError("อุปกรณ์นี้ติดตามตำแหน่งไม่ได้"); return; }
    destRef.current = dest;
    routeRef.current = null; kRef.current = 1; lastFetch.current = 0;
    setRoute(null); setK(1); setError(""); setActive(true);
    watchId.current = navigator.geolocation.watchPosition(onPos,
      () => setError("ติดตามตำแหน่งไม่ได้ ตรวจสอบว่าอนุญาตการเข้าถึงตำแหน่งแล้ว"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
    // กันหน้าจอดับระหว่างนำทาง (ถ้าเบราว์เซอร์รองรับ)
    navigator.wakeLock?.request("screen").then((l) => { wake.current = l; }).catch(() => {});
  };

  const stop = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    wake.current?.release?.().catch?.(() => {});
    wake.current = null;
    setActive(false);
  };

  // ออกจากหน้า: หยุดติดตามตำแหน่ง / ปล่อย wake lock
  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    wake.current?.release?.().catch?.(() => {});
  }, []);

  // ค่าที่คำนวณจากสถานะปัจจุบัน
  const step = route?.steps[k];
  const toNext = pos && step ? meters(pos, step.loc) : null;
  const remainM = route && toNext != null ? toNext + route.steps.slice(k).reduce((s, x) => s + x.distance, 0) : null;
  const remainS = route && remainM != null ? route.seconds * (remainM / Math.max(1, route.meters)) : null;
  const arrived = Boolean(pos && dest && meters(pos, dest) < ARRIVE_M);

  return { active, start, stop, pos, route, step, toNext, remainM, remainS, arrived, error, rerouting, stepIndex: k };
}
