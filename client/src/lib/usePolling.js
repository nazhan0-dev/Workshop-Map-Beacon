import { useEffect, useRef } from "react";

// เรียก fn ทันที แล้วเรียกซ้ำทุก ms (หยุดตอนแท็บไม่ได้เปิดอยู่ แล้วโหลดใหม่ทันทีเมื่อกลับมา)
export default function usePolling(fn, ms = 30000) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    let t;
    const tick = () => { if (!document.hidden) ref.current(); };
    tick();
    t = setInterval(tick, ms);
    const onVis = () => { if (!document.hidden) ref.current(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [ms]);
}
