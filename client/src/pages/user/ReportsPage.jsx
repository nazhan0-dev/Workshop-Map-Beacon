import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Siren, ShieldAlert, FileText, Plus } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import { Spinner } from "../../components/ui";
import usePolling from "../../lib/usePolling";
import { today, addDays } from "../../lib/shifts";
import IncidentRow from "../../components/incidents/IncidentRow";
import IncidentModal from "../../components/incidents/IncidentModal";
import ReportModal from "../../components/incidents/ReportModal";
import RankBadge from "../../components/RankBadge";

function Section({ icon, title, aside, children }) {
  const Icon = icon;
  return (
    <section className="dash-rise bg-white rounded-[22px] p-3 md:p-4">
      <div className="flex items-center gap-2.5 px-1 pb-2">
        <span className="w-8 h-8 rounded-lg bg-paper flex items-center justify-center"><Icon size={16} /></span>
        <h2 className="font-semibold flex-1">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// หน้ารายงานเหตุการณ์ของ รปภ.
// หัวหน้า/รองหัวหน้า เห็นเรื่องที่คนอื่นรายงานในกะที่ตัวเองเข้าเวรด้วย และรับเรื่อง/ปิดเรื่องได้
export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [openBase, setOpenBase] = useState({ canHandle: false });
  const reporting = params.has("new");

  const load = useCallback(async () => {
    try {
      const [inc, asg] = await Promise.all([
        api.get("/me/incidents"),
        api.get("/me/assignments", { from: addDays(today(), -1), days: 2 }),
      ]);
      setData(inc);
      // รายงานได้: เวรวันนี้ทุกกะ + กะดึกเมื่อคืน (ยังคาบเกี่ยวถึงเช้านี้)
      const y = addDays(today(), -1);
      setShifts(asg.filter((a) => a.date === today() || (a.date === y && a.shift === "NIGHT")));
    } catch (e) { toast(errMsg(e), "error"); }
  }, []);
  usePolling(load, 30000);

  const defaultId = Number(params.get("new")) || undefined;
  const openReport = () => setParams({ new: "" });
  const closeReport = () => setParams({});

  const teamOpen = useMemo(() => data?.team.filter((i) => i.status !== "CLOSED").length || 0, [data]);
  const open = (inc, canHandle) => { setOpenBase({ canHandle }); setOpenId(inc.id); };
  const patch = (r) => setData((d) => d && ({
    ...d, team: d.team.map((i) => (i.id === r.id ? { ...i, ...r } : i)), mine: d.mine.map((i) => (i.id === r.id ? { ...i, ...r } : i)),
  }));

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 pb-6 md:pt-2 flex flex-col gap-3">
      <header className="flex items-center gap-3 px-1">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">รายงาน</h1>
          <p className="text-sm text-mute">แจ้งเหตุการณ์ที่จุดเวรให้หัวหน้าและผู้ดูแลทราบ</p>
        </div>
      </header>

      {/* ปุ่มรายงาน */}
      <button onClick={openReport} disabled={!shifts.length}
        className="dash-rise group bg-ink text-white rounded-[22px] p-4 flex items-center gap-4 text-left hover:bg-black transition-colors disabled:bg-white disabled:text-ink disabled:cursor-not-allowed">
        <span className="w-12 h-12 rounded-2xl bg-white/10 group-disabled:bg-paper flex items-center justify-center shrink-0"><Siren size={22} /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[17px]">รายงานเหตุการณ์</span>
          <span className="block text-sm text-white/60 group-disabled:text-mute">
            {data == null ? "กำลังโหลด…" : shifts.length ? "ปกติ ผิดปกติ หรือด่วน แนบรูปได้" : "รายงานได้เมื่อมีเวรวันนี้"}
          </span>
        </span>
        <Plus size={22} className="shrink-0 group-disabled:hidden" />
      </button>

      {!data ? <div className="py-10 flex justify-center"><Spinner /></div> : (
        <>
          {data.isLeader && (
            <Section icon={ShieldAlert} title="เรื่องในกะของคุณ"
              aside={<span className="flex items-center gap-2 text-xs text-mute"><RankBadge rank={user.rank} />{teamOpen ? <b className="text-danger">{teamOpen} เรื่องค้าง</b> : null}</span>}>
              {data.team.length === 0
                ? <p className="text-sm text-mute px-1 py-3">ยังไม่มีใครรายงานในกะที่คุณเข้าเวร (7 วันล่าสุด)</p>
                : <ul className="-mx-1">{data.team.map((i, n) => <IncidentRow key={i.id} inc={i} onOpen={(x) => open(x, true)} style={{ animationDelay: `${Math.min(n, 8) * 0.04}s` }} />)}</ul>}
            </Section>
          )}

          <Section icon={FileText} title="ที่ฉันรายงาน" aside={<span className="text-xs text-mute">{data.mine.length ? `${data.mine.length} เรื่อง` : ""}</span>}>
            {data.mine.length === 0
              ? <p className="text-sm text-mute px-1 py-3">ยังไม่เคยรายงาน เห็นอะไรผิดปกติที่จุดเวร กดปุ่มด้านบนได้เลย</p>
              : <ul className="-mx-1">{data.mine.map((i, n) => <IncidentRow key={i.id} inc={i} showReporter={false} onOpen={(x) => open(x, false)} style={{ animationDelay: `${Math.min(n, 8) * 0.04}s` }} />)}</ul>}
          </Section>
        </>
      )}

      {reporting && shifts.length > 0 && (
        <ReportModal open shifts={shifts} defaultId={defaultId}
          onClose={closeReport} onSent={(r) => setData((d) => d && ({ ...d, mine: [r, ...d.mine] }))} />
      )}
      {openId && (
        <IncidentModal key={openId} id={openId} base="/me/incidents" canHandle={openBase.canHandle}
          onClose={() => setOpenId(null)} onChanged={patch} />
      )}
    </div>
  );
}
