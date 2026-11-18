import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check, Navigation, Phone, Siren, CalendarOff, ChevronRight, AlertTriangle, Sun, Sunset, Moon, Users, ClipboardList,
  CalendarDays, CalendarX2, MapPinned, Clock, ChevronDown,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import useMyShifts from "../../store/useMyShifts";
import { toast } from "../../store/useToast";
import { Avatar, Button } from "../../components/ui";
import MiniMap from "../../components/map/MiniMap";
import ShiftCalendar from "../../components/ShiftCalendar";
import { errMsg } from "../../lib/api";
import { SHIFT_INFO, fmtShort, parseDate, shiftTiming, currentShift, today, addDays } from "../../lib/shifts";
import RankBadge from "../../components/RankBadge";
import CheckInBar from "../../components/attendance/CheckInBar";
import LeaderTeamCard from "../../components/attendance/LeaderTeamCard";
import AttendanceChip from "../../components/attendance/AttendanceChip";

const SHIFT_ICON = { MORNING: Sun, AFTERNOON: Sunset, NIGHT: Moon };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "สวัสดีตอนเช้า" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
}

// ช่วงเวลาของกะ (กะยาว 8 ชม.)
function shiftWindow(a) {
  const start = parseDate(a.date);
  start.setHours(Number(SHIFT_INFO[a.shift].time.slice(0, 2)), 0, 0, 0);
  return [start, new Date(start.getTime() + 8 * 3600e3)];
}
const hm = (d) => d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// เวลาปัจจุบัน อัปเดตทุกวินาที (ตรงกับต้นวินาที) ให้นาฬิกา/นับถอยหลัง/แถบกะเดินเอง
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id;
    const first = setTimeout(() => { setNow(new Date()); id = setInterval(() => setNow(new Date()), 1000); }, 1000 - (Date.now() % 1000));
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  return now;
}

// 9296000 ms -> "2:34:56" / ไม่ถึงชั่วโมง -> "34:56"
const hms = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
};

// ตัวเลขที่เปลี่ยนจะเลื่อนลงมาจากด้านบนทีละหลัก (แบบเครื่องนับ)
function Ticker({ text, className = "" }) {
  const chars = [...text];
  return (
    <span className={`inline-flex tabular-nums ${className}`} aria-label={text}>
      {chars.map((c, i) => (
        <span key={`${chars.length - i}-${c}`} aria-hidden className={/\d/.test(c) ? "tick-in inline-block" : "inline-block"}>{c}</span>
      ))}
    </span>
  );
}

function Card({ title, icon, aside, children, delay = 0, className = "" }) {
  const Icon = icon;
  return (
    <section className={`dash-rise bg-white rounded-[22px] p-4 md:p-5 ${className}`} style={{ animationDelay: `${delay}s` }}>
      {title && (
        <div className="flex items-center gap-2 mb-2.5">
          {Icon && <Icon size={16} className="text-mute" />}
          <h2 className="font-semibold text-sm flex-1">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export default function MyShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const { items, error, load, ack } = useMyShifts();
  const [acking, setAcking] = useState(false);
  const [justAcked, setJustAcked] = useState(false); // เพิ่งกดรับทราบ: เน้นปุ่มนำทางให้เห็นชัด
  const now = useNow();
  useEffect(() => { load(); }, [load]);

  const hero = currentShift(items);
  const rest = items?.filter((i) => i !== hero) || [];
  const weekEnd = addDays(today(), 6);
  const weekCount = (items || []).filter((i) => i.date >= today() && i.date <= weekEnd).length;
  const pending = (items || []).filter((i) => !i.acknowledged_at).length;

  const onAck = async () => {
    setAcking(true);
    try { await ack(hero.id); setJustAcked(true); toast("รับทราบเวรแล้ว กดนำทางเพื่อดูเส้นทางไปจุดเวร"); }
    catch (e) { toast(errMsg(e), "error"); }
    finally { setAcking(false); }
  };

  // สถานะกะ + ความคืบหน้า
  let timing = null;
  if (hero) {
    const [start, end] = shiftWindow(hero);
    const live = now >= start && now < end;
    const ended = now >= end;
    timing = {
      start, end, live, ended,
      pct: live ? ((now - start) / (end - start)) * 100 : ended ? 100 : 0,
      label: live ? "เหลืออีก" : ended ? "" : "เริ่มในอีก",
      count: live ? hms(end - now) : ended ? "" : hms(start - now),
    };
  }
  const HeroIcon = hero ? SHIFT_ICON[hero.shift] : null;

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 pt-6 pb-6 md:px-0 md:pt-0">
      {/* ทักทาย */}
      <header className="dash-rise relative z-30 bg-white rounded-[22px] p-3.5 md:p-4 mb-3 md:mb-4 flex items-center gap-3 md:gap-4">
        <Avatar name={user.name} size={48} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-mute">{greeting()}</div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg md:text-xl font-bold truncate">{user.name}</span>
            <RankBadge rank={user.rank} />
          </div>
        </div>

        {/* สรุปเวร 7 วันข้างหน้า (แท็บเล็ตขึ้นไป) */}
        {items && (
          <div className="hidden md:flex items-center divide-x divide-line">
            <div className="px-4 text-right">
              <div className="text-xl font-bold leading-none tabular-nums">{weekCount}</div>
              <div className="text-[11px] text-mute mt-1">เวรใน 7 วัน</div>
            </div>
            <div className="px-4 text-right">
              <div className={`text-xl font-bold leading-none tabular-nums ${pending ? "text-warn" : "text-brand"}`}>{pending}</div>
              <div className="text-[11px] text-mute mt-1">รอรับทราบ</div>
            </div>
          </div>
        )}

        {/* แจ้งลา */}
        <Link to="/me/leaves?new" aria-label="แจ้งลา" title="แจ้งลา"
          className="shrink-0 h-11 sm:h-12 w-11 sm:w-auto sm:px-3.5 rounded-xl sm:rounded-2xl bg-paper hover:bg-track transition-colors flex items-center justify-center gap-2 text-sm font-semibold">
          <CalendarOff size={18} /><span className="hidden sm:inline">แจ้งลา</span>
        </Link>

        {/* เวลา + วันที่ กดเพื่อดูปฏิทินเวร (มือถือเป็นปุ่มไอคอน) */}
        <ShiftCalendar items={items || []} className="shrink-0" trigger={
          <>
            <span className="sm:hidden w-11 h-11 rounded-xl bg-paper flex items-center justify-center"><CalendarDays size={19} /></span>
            <span className="hidden sm:flex items-center gap-2.5 h-12 pl-1.5 pr-3 rounded-2xl bg-paper hover:bg-track transition-colors">
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-[0_1px_2px_rgb(23_25_28/0.06)]">
                <CalendarDays size={17} />
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="text-[15px] font-bold tabular-nums">{hm(now)}</span>
                <span className="text-[11px] text-mute mt-1">{now.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}</span>
              </span>
              <ChevronDown size={15} className="text-mute transition-transform [[aria-expanded=true]_&]:rotate-180" />
            </span>
          </>
        } />
      </header>

      {error && <p className="text-sm text-danger px-1 mb-3">{error}</p>}

      {!items ? (
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-3 md:gap-4" aria-busy="true">
          <div className="h-[300px] rounded-[26px] skeleton bg-white" />
          <div className="h-[300px] rounded-[22px] skeleton bg-white" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-3 md:gap-4 items-start lg:items-stretch">
          {/* คอลัมน์ซ้าย: เวรวันนี้ */}
          <div className="flex flex-col gap-3 md:gap-4 min-w-0">
            {hero ? (
              <section className="hero-dark dash-rise text-white rounded-[26px] p-5 md:p-6 overflow-hidden relative lg:flex-1 lg:flex lg:flex-col">
                <div className="md:grid md:grid-cols-2 md:gap-5 lg:flex-1">
                  <div className="flex-1 min-w-0 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                        ${timing.live ? "bg-[#3ec482]/20 text-[#7ddcac]" : timing.ended ? "bg-white/10 text-white/60" : "bg-warn/25 text-[#f0b968]"}`}>
                        {timing.live && <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-[#7ddcac] animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-[#7ddcac]" /></span>}
                        {timing.live ? "กำลังเข้าเวร" : timing.ended ? "จบกะแล้ว" : shiftTiming(hero, now).text}
                      </span>
                      <span className="text-[13px] text-white/55 ml-auto">เวรวันนี้ {fmtShort(hero.date)}</span>
                    </div>

                    <div>
                      <h1 className="text-[26px] md:text-[32px] font-bold leading-tight">{hero.location_name}</h1>
                      <p className="flex items-center gap-2 mt-1.5 text-sm text-white/70">
                        <HeroIcon size={15} />กะ{SHIFT_INFO[hero.shift].label} · {SHIFT_INFO[hero.shift].time}
                      </p>
                    </div>

                    {/* ความคืบหน้าของกะ: นับถอยหลังทุกวินาที */}
                    <div className="time-box rounded-2xl bg-white text-ink px-3.5 py-3">
                      <div className="flex items-center gap-1.5 mb-2 text-sm">
                        <Clock size={14} className="text-mute" />
                        {timing.ended
                          ? <span className="font-semibold text-mute">จบกะแล้ว</span>
                          : <>
                              <span className="text-mute">{timing.label}</span>
                              <Ticker text={timing.count} className={`text-base font-bold ${timing.live ? "text-ink" : "text-warn"}`} />
                            </>}
                        {timing.live && <span className="ml-auto text-xs font-semibold text-brand tabular-nums">{Math.floor(timing.pct)}%</span>}
                      </div>
                      <div className="relative h-2 rounded-full bg-track">
                        <div className={`shift-bar relative h-full rounded-full ${timing.ended ? "bg-faint" : timing.live ? "bg-brand" : "bg-warn"}`}
                          style={{ width: `${Math.max(timing.pct, timing.live ? 2 : 0)}%` }}>
                          {timing.live && <span className="shift-head" />}
                        </div>
                      </div>
                      <div className="flex justify-between mt-1.5 text-[11px] text-mute tabular-nums">
                        <span>เริ่ม {hm(timing.start)}</span>
                        <span>เลิก {hm(timing.end)}</span>
                      </div>
                    </div>

                    {/* แผนที่ย่อ (มือถือ) */}
                    <Link to={`/me/map?id=${hero.id}`} className="loc-card md:hidden block rounded-2xl overflow-hidden ring-1 ring-white/10" aria-label="ดูจุดเวรบนแผนที่">
                      <MiniMap lat={hero.lat} lng={hero.lng} className="h-28" />
                    </Link>

                    {hero.acknowledged_at ? (
                      // รับทราบแล้ว: ขั้นต่อไปคือไปที่จุดเวร ปุ่มนำทาง (แผนที่ในแอป) จึงเป็นปุ่มหลัก
                      <div>
                        <div className="flex gap-2.5">
                          <span title="รับทราบแล้ว" aria-label="รับทราบแล้ว"
                            className={`${justAcked ? "pop-in" : ""} w-12 h-12 shrink-0 rounded-[14px] bg-[#3ec482]/20 text-[#7ddcac] flex items-center justify-center`}>
                            <Check size={20} strokeWidth={2.5} />
                          </span>
                          <Link to={`/me/map?id=${hero.id}`}
                            className={`${justAcked ? "nav-cta" : ""} group flex-1 h-12 rounded-[14px] bg-white text-ink flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[#f0f1ef] active:scale-[0.98] transition`}>
                            <Navigation size={16} className="transition-transform group-hover:rotate-12" />นำทางไปจุดเวร
                          </Link>
                        </div>
                        <p className="text-xs text-white/50 mt-2">รับทราบแล้ว {new Date(hero.acknowledged_at.replace(" ", "T")).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.</p>
                      </div>
                    ) : (
                      <div className="flex gap-2.5">
                        <Button variant="green" className="flex-1 h-12 rounded-[14px] text-[15px]" loading={acking} onClick={onAck}><Check size={18} />รับทราบเวร</Button>
                        <Link to={`/me/map?id=${hero.id}`}
                          className="h-12 px-4 rounded-[14px] bg-white/10 border border-white/15 flex items-center gap-2 text-sm font-semibold hover:bg-white/15">
                          <Navigation size={16} />นำทาง
                        </Link>
                      </div>
                    )}
                    {/* เข้ากะ / ออกกะ */}
                    <CheckInBar asg={hero} timing={timing} now={now} />

                    <Link to={`/me/reports?new=${hero.id}`}
                      className="group mt-2.5 lg:mt-auto h-10 rounded-xl bg-[#b3261e] text-white flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[#9a1f18] active:scale-[0.99] transition">
                      <Siren size={15} className="transition-transform group-hover:scale-110" />รายงานเหตุการณ์
                    </Link>
                  </div>

                  {/* แผนที่ย่อ (แท็บเล็ต) */}
                  <Link to={`/me/map?id=${hero.id}`} className="loc-card hidden md:block min-w-0 rounded-2xl overflow-hidden ring-1 ring-white/10 relative" aria-label="ดูจุดเวรบนแผนที่">
                    <MiniMap lat={hero.lat} lng={hero.lng} className="h-full min-h-[220px]" />
                    <span className="absolute left-2.5 bottom-2.5 flex items-center gap-1 text-[11px] font-semibold bg-white/95 text-ink rounded-md px-2 py-1 shadow-sm">
                      <MapPinned size={12} />ดูบนแผนที่
                    </span>
                  </Link>
                </div>
              </section>
            ) : (
              <Card delay={0}>
                <div className="flex flex-col items-center text-center py-6">
                  <span className="w-14 h-14 rounded-2xl bg-paper flex items-center justify-center mb-3"><CalendarX2 size={24} /></span>
                  <p className="font-semibold">วันนี้ไม่มีเวร</p>
                  <p className="text-sm text-mute mt-1 max-w-xs">{rest.length ? "พักผ่อนให้เต็มที่ ดูเวรถัดไปของคุณได้ในรายการ" : "ยังไม่มีเวรใน 2 สัปดาห์นี้ ถ้าคิดว่าผิดพลาด ติดต่อหัวหน้าเวร"}</p>
                </div>
              </Card>
            )}
          </div>

          {/* คอลัมน์ขวา: สิ่งที่ต้องทำ + เพื่อนร่วมกะ + เวรถัดไป (จอเล็กเรียงต่อจากการ์ดเวรตามลำดับนี้) */}
          <div className="flex flex-col gap-3 md:gap-4 min-w-0">
            {hero && (hero.duties || hero.cautions || hero.contact_phone) && (
              <Card title="สิ่งที่ต้องทำที่จุดนี้" icon={ClipboardList} delay={0.08}>
                {hero.duties && <p className="text-sm leading-relaxed">{hero.duties}</p>}
                {hero.cautions && (
                  <div className="mt-3 border-l-2 border-warn pl-3">
                    <span className="flex items-center gap-1 text-xs font-semibold text-warn"><AlertTriangle size={12} />ข้อควรระวัง</span>
                    <p className="text-sm text-mute mt-0.5 leading-relaxed">{hero.cautions}</p>
                  </div>
                )}
                {hero.contact_phone && (
                  <a href={`tel:${hero.contact_phone}`}
                    className="mt-4 flex items-center gap-3 rounded-xl bg-paper hover:bg-track px-3.5 py-3 transition-colors">
                    <span className="w-9 h-9 rounded-lg bg-white text-brand flex items-center justify-center"><Phone size={16} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs text-mute">หัวหน้าจุด</span>
                      <span className="block text-sm font-semibold tabular-nums">{hero.contact_phone}</span>
                    </span>
                    <span className="text-xs font-semibold text-brand">โทร</span>
                  </a>
                )}
              </Card>
            )}

            {/* หัวหน้า/รองหัวหน้า: ทีมในกะเข้ากะครบไหม */}
            {user?.rank && user.rank !== "STAFF" && <LeaderTeamCard delay={0.1} />}

            {hero && (
              <Card title="อยู่กะเดียวกับคุณ" icon={Users} delay={0.12}
                aside={<span className="text-xs text-mute">{hero.teammates.length ? `${hero.teammates.length} คน` : ""}</span>}>
                {hero.teammates.length === 0 && <p className="text-sm text-mute py-1">คุณประจำจุดนี้คนเดียว</p>}
                {hero.teammates.map((t, i) => (
                  <div key={t.id} style={{ animationDelay: `${0.2 + i * 0.05}s` }} className="row-in flex items-center gap-3 py-2 border-t border-line first:border-t-0">
                    <Avatar name={t.name} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5"><span className="font-semibold truncate">{t.name}</span><RankBadge rank={t.rank} quiet /><AttendanceChip a={t} quiet /></div>
                      {t.position && <div className="text-xs text-mute truncate">{t.position}</div>}
                    </div>
                    {t.phone && (
                      <a href={`tel:${t.phone}`} aria-label={`โทรหา ${t.name}`}
                        className="w-10 h-10 rounded-xl bg-paper flex items-center justify-center text-brand hover:bg-brand-soft transition-colors"><Phone size={16} /></a>
                    )}
                  </div>
                ))}
              </Card>
            )}

            <Card title="เวรถัดไป" icon={CalendarDays} delay={0.16}
              aside={<Link to="/me/map" className="text-xs font-semibold text-mute hover:text-ink">ดูบนแผนที่</Link>}>
              {rest.length === 0 && <p className="text-sm text-mute py-2">ยังไม่มีเวรถัดไป</p>}
              {rest.map((a, i) => {
                const d = parseDate(a.date);
                const Icon = SHIFT_ICON[a.shift];
                const tomorrow = a.date === addDays(today(), 1);
                return (
                  <Link key={a.id} to={`/me/map?id=${a.id}`} style={{ animationDelay: `${0.22 + Math.min(i, 8) * 0.04}s` }}
                    className="row-in group flex items-center gap-3 py-2.5 border-t border-line first:border-t-0 -mx-2 px-2 rounded-xl hover:bg-paper/70 transition-colors">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${tomorrow ? "bg-ink text-white" : "bg-paper"}`}>
                      <span className={`text-[10px] font-semibold leading-none ${tomorrow ? "text-white/70" : "text-mute"}`}>{d.toLocaleDateString("th-TH", { weekday: "short" })}</span>
                      <span className="text-lg font-bold leading-none mt-0.5">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold whitespace-nowrap">
                        <Icon size={14} className="text-mute shrink-0" />กะ{SHIFT_INFO[a.shift].label}
                        {tomorrow && <span className="text-[10px] font-bold text-white bg-ink rounded px-1.5 py-0.5">พรุ่งนี้</span>}
                      </div>
                      <div className="text-xs text-mute truncate">{SHIFT_INFO[a.shift].time} · {a.location_name}</div>
                    </div>
                    {a.acknowledged_at
                      ? <span title="รับทราบแล้ว" className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0"><Check size={13} strokeWidth={3} /></span>
                      : <span className="text-[11px] font-semibold text-warn bg-warn-soft rounded-md px-1.5 py-0.5 shrink-0 whitespace-nowrap">รอรับทราบ</span>}
                    <ChevronRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </Link>
                );
              })}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
