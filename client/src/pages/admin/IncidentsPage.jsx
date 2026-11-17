import { useCallback, useState } from "react";
import { Siren, CheckCheck } from "lucide-react";
import Header from "../../components/layout/Header";
import { Segmented, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import usePolling from "../../lib/usePolling";
import useIncidentSummary from "../../store/useIncidentSummary";
import { LEVELS, LEVEL_KEYS } from "../../lib/incidents";
import IncidentRow from "../../components/incidents/IncidentRow";
import IncidentModal from "../../components/incidents/IncidentModal";

const STATUS_OPTS = [
  { value: "open", label: "ยังไม่ปิด" },
  { value: "closed", label: "ปิดแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];

// รายงานเหตุการณ์ทั้งหมด (admin)
export default function IncidentsPage() {
  const [status, setStatus] = useState("open");
  const [level, setLevel] = useState("");
  const [rows, setRows] = useState(null);
  const [openId, setOpenId] = useState(null);
  const summary = useIncidentSummary();

  const load = useCallback(async () => {
    try {
      const r = await api.get("/incidents", { status, ...(level ? { level } : {}) });
      setRows(r);
      useIncidentSummary.getState().refresh();
    } catch (e) { toast(errMsg(e), "error"); }
  }, [status, level]);
  usePolling(load, 30000);

  const onChanged = (r) => {
    setRows((list) => list?.map((i) => (i.id === r.id ? { ...i, ...r } : i)));
    useIncidentSummary.getState().refresh();
  };

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title="รายงานเหตุการณ์"
        subtitle={summary.open ? `ค้าง ${summary.open} เรื่อง${summary.urgent ? ` · ด่วน ${summary.urgent}` : ""}` : "ไม่มีเรื่องค้าง"} />

      <div className="dash-rise surface mx-3 md:mx-0 p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-2">
          <Segmented options={STATUS_OPTS} value={status} onChange={(v) => { setRows(null); setStatus(v); }} className="sm:w-[320px]" />
          <div className="flex gap-1.5 flex-wrap sm:ml-auto" role="group" aria-label="กรองตามระดับ">
            <button onClick={() => setLevel("")}
              className={`h-8 px-3 rounded-lg text-sm font-semibold border ${!level ? "bg-ink text-white border-ink" : "border-line hover:bg-paper"}`}>ทุกระดับ</button>
            {LEVEL_KEYS.map((k) => {
              const L = LEVELS[k], Icon = L.icon;
              return (
                <button key={k} onClick={() => setLevel(k)} aria-pressed={level === k}
                  className={`h-8 px-3 rounded-lg text-sm font-semibold border flex items-center gap-1.5 ${level === k ? "bg-ink text-white border-ink" : "border-line hover:bg-paper"}`}>
                  <Icon size={13} />{L.label}
                </button>
              );
            })}
          </div>
        </div>

        {!rows ? <div className="py-14 flex justify-center"><Spinner /></div>
          : rows.length === 0 ? (
            <div className="py-14 flex flex-col items-center text-center">
              <span className="w-14 h-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
                {status === "open" ? <CheckCheck size={24} /> : <Siren size={24} />}
              </span>
              <p className="font-semibold">{status === "open" ? "ไม่มีเรื่องค้าง" : "ยังไม่มีรายงาน"}</p>
              <p className="text-sm text-mute mt-1">รายงานจาก รปภ. จะขึ้นที่นี่ หน้านี้อัปเดตเองทุก 30 วินาที</p>
            </div>
          ) : (
            <ul key={`${status}-${level}`} className="divide-y divide-line">
              {rows.map((i, n) => <IncidentRow key={i.id} inc={i} onOpen={(x) => setOpenId(x.id)} style={{ animationDelay: `${Math.min(n, 10) * 0.03}s` }} />)}
            </ul>
          )}
      </div>

      {openId && <IncidentModal key={openId} id={openId} base="/incidents" canHandle onClose={() => setOpenId(null)} onChanged={onChanged} />}
    </div>
  );
}
