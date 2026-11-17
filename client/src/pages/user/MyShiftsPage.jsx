import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Check, Navigation, Phone, ChevronRight, AlertTriangle } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import useMyShifts from "../../store/useMyShifts";
import { toast } from "../../store/useToast";
import { Avatar, Button, Spinner } from "../../components/ui";
import { errMsg } from "../../lib/api";
import { SHIFT_INFO, fmtShort, parseDate, shiftTiming, currentShift } from "../../lib/shifts";
import { mapsUrl } from "../../lib/maps";
import RankBadge from "../../components/RankBadge";


function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "สวัสดีตอนเช้า" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
}

export default function MyShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const { items, error, load, ack } = useMyShifts();
  const [acking, setAcking] = useState(false);
  useEffect(() => { load(); }, [load]);

  const hero = currentShift(items);
  const rest = items?.filter((i) => i !== hero) || [];

  const onAck = async () => {
    setAcking(true);
    try { await ack(hero.id); toast("รับทราบเวรแล้ว"); }
    catch (e) { toast(errMsg(e), "error"); }
    finally { setAcking(false); }
  };

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 px-1 pb-1">
        <Avatar name={user.name} size={42} />
        <div className="flex-1"><div className="text-sm text-mute">{greeting()}</div><div className="flex items-center gap-2 min-w-0"><span className="text-lg font-semibold truncate">{user.name}</span><RankBadge rank={user.rank} /></div></div>
      </div>

      {error && <p className="text-sm text-danger px-1">{error}</p>}
      {!items ? <div className="py-16 flex justify-center"><Spinner /></div> : (
        <>
          {hero ? (
            <section className="bg-ink text-white rounded-3xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#a9adb2] flex-1">เวรวันนี้ {fmtShort(hero.date)}</span>
                <span className="text-xs font-semibold bg-brand/20 text-[#6fd3a0] px-2.5 py-1 rounded-full">{shiftTiming(hero).text}</span>
              </div>
              <div>
                <h1 className="text-[26px] font-bold leading-tight">{hero.location_name}</h1>
                <p className="flex items-center gap-2 mt-1.5 text-sm text-[#c9ccd0]"><Clock size={15} />กะ{SHIFT_INFO[hero.shift].label} {SHIFT_INFO[hero.shift].time}</p>
              </div>
              <div className="flex gap-2.5">
                {hero.acknowledged_at
                  ? <span className="flex-1 h-[46px] rounded-[14px] bg-white/10 flex items-center justify-center gap-2 text-sm font-semibold text-[#6fd3a0]"><Check size={18} />รับทราบแล้ว</span>
                  : <Button variant="green" className="flex-1 h-[46px] rounded-[14px]" loading={acking} onClick={onAck}><Check size={18} />รับทราบเวร</Button>}
                <a href={mapsUrl(hero.lat, hero.lng)} target="_blank" rel="noreferrer"
                  className="h-[46px] px-4 rounded-[14px] bg-white/10 border border-white/15 flex items-center gap-2 text-sm font-semibold hover:bg-white/15">
                  <Navigation size={16} />นำทาง
                </a>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-3xl p-5">
              <p className="font-semibold">วันนี้ไม่มีเวร</p>
              <p className="text-sm text-mute mt-1">{rest.length ? "ดูเวรถัดไปของคุณด้านล่าง" : "ยังไม่มีเวรใน 2 สัปดาห์นี้ ถ้าคิดว่าผิดพลาด ติดต่อหัวหน้าเวร"}</p>
            </section>
          )}

          {hero && (
            <>
              <section className="bg-white rounded-[20px] px-4 py-3.5">
                <div className="text-xs text-mute mb-1">อยู่กะเดียวกับคุณ</div>
                {hero.teammates.length === 0 && <p className="text-sm text-mute py-1">คุณประจำจุดนี้คนเดียว</p>}
                {hero.teammates.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-1.5">
                    <Avatar name={t.name} size={38} />
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><span className="font-semibold truncate">{t.name}</span><RankBadge rank={t.rank} quiet /></div>{t.position && <div className="text-xs text-mute">{t.position}</div>}</div>
                    {t.phone && <a href={`tel:${t.phone}`} aria-label={`โทรหา ${t.name}`} className="w-[38px] h-[38px] rounded-xl border border-line flex items-center justify-center text-brand hover:bg-paper"><Phone size={16} /></a>}
                  </div>
                ))}
              </section>

              {(hero.duties || hero.cautions || hero.contact_phone) && (
                <section className="bg-white rounded-[20px] p-4">
                  <h2 className="font-semibold text-sm">สิ่งที่ต้องทำที่จุดนี้</h2>
                  {hero.duties && <p className="text-sm text-mute leading-relaxed mt-1.5">{hero.duties}</p>}
                  {hero.cautions && <p className="text-sm text-warn leading-relaxed mt-2 flex gap-1.5"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{hero.cautions}</p>}
                  {hero.contact_phone && <a href={`tel:${hero.contact_phone}`} className="flex items-center gap-1.5 mt-2.5 text-sm font-semibold"><Phone size={14} />หัวหน้าจุด {hero.contact_phone}</a>}
                </section>
              )}
            </>
          )}

          <section className="bg-white rounded-[20px] px-4 pt-3.5 pb-1">
            <div className="flex items-center mb-1"><h2 className="font-semibold text-sm flex-1">เวรถัดไป</h2><Link to="/me/map" className="text-xs text-mute hover:text-ink">ดูบนแผนที่</Link></div>
            {rest.length === 0 && <p className="text-sm text-mute py-3 border-t border-line">ยังไม่มีเวรถัดไป</p>}
            {rest.map((a) => {
              const d = parseDate(a.date);
              return (
                <Link key={a.id} to={`/me/map?id=${a.id}`} className="flex items-center gap-3 py-3 border-t border-line">
                  <div className="w-11 text-center">
                    <div className="text-xs text-mute">{d.toLocaleDateString("th-TH", { weekday: "short" })}</div>
                    <div className="text-xl font-semibold leading-none mt-0.5">{d.getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">กะ{SHIFT_INFO[a.shift].label} <span className="text-sm text-mute font-normal">{SHIFT_INFO[a.shift].time}</span></div>
                    <div className="text-xs text-mute truncate">{a.location_name}</div>
                  </div>
                  <ChevronRight size={16} className="text-faint" />
                </Link>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
