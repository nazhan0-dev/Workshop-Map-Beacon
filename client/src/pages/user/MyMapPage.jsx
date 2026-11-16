import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Navigation } from "lucide-react";
import useMyShifts from "../../store/useMyShifts";
import MapView, { MapOverlay } from "../../components/map/MapView";
import { Segmented, Spinner } from "../../components/ui";
import { SHIFT_INFO, today, addDays, fmtShort, currentShift } from "../../lib/shifts";
import { mapsUrl } from "../../lib/maps";

function distanceKm(a, b) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function MyMapPage() {
  const { items, load } = useMyShifts();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [day, setDay] = useState("today");
  const [me, setMe] = useState(null);

  useEffect(() => { if (!items) load(); }, [items, load]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setMe([p.coords.latitude, p.coords.longitude]), () => {}, { timeout: 8000 });
  }, []);

  const byId = items?.find((i) => i.id === Number(params.get("id")));
  const target = byId || currentShift(items, day === "today" ? today() : addDays(today(), 1));

  const dist = me && target ? distanceKm(me, [target.lat, target.lng]) : null;
  const mates = target?.teammates?.map((t) => t.name).join(", ");

  return (
    <div className="relative flex-1 min-h-[calc(100dvh-84px)]">
      <div className="absolute inset-0">
        {!items ? <div className="h-full flex items-center justify-center"><Spinner /></div> : (
          <MapView fitKey={target ? `t${target.id}` : "none"} me={me}
            markers={target ? [{ id: target.id, lat: target.lat, lng: target.lng, name: target.location_name,
              status: "ok", label: `${(target.teammates?.length || 0) + 1} คน` }] : []}
            selectedId={target?.id}>
            <MapOverlay className="absolute top-4 inset-x-4 z-[500] flex gap-2.5">
              <button onClick={() => navigate("/me")} aria-label="กลับ" className="w-[46px] h-[46px] rounded-xl bg-white shadow-md flex items-center justify-center"><ChevronLeft size={20} /></button>
              {!byId && (
                <Segmented className="flex-1 bg-white shadow-md" value={day} onChange={setDay}
                  options={[{ value: "today", label: "วันนี้" }, { value: "tomorrow", label: "พรุ่งนี้" }]} />
              )}
            </MapOverlay>
          </MapView>
        )}
      </div>

      {items && (
        <div className="absolute inset-x-0 bottom-0 z-[600] bg-white rounded-t-3xl shadow-[0_-6px_24px_rgb(23_25_28/0.08)] px-5 pb-5">
          <div className="w-9 h-1 rounded bg-line mx-auto my-2.5" />
          {target ? (
            <>
              <div className="flex items-start gap-3 mt-1">
                <div className="flex-1 min-w-0">
                  <h1 className="text-[19px] font-semibold">{target.location_name}</h1>
                  <p className="text-sm text-mute">{fmtShort(target.date)} กะ{SHIFT_INFO[target.shift].label} {SHIFT_INFO[target.shift].time}</p>
                </div>
                {dist != null && (
                  <div className="text-right">
                    <div className="text-[19px] font-semibold">{dist < 1 ? `${Math.round(dist * 1000)} ม.` : `${dist.toFixed(1)} กม.`}</div>
                    <div className="text-xs text-mute">จากตำแหน่งคุณ</div>
                  </div>
                )}
              </div>
              <p className="text-xs text-mute mt-3 mb-4">{mates ? `เข้าเวรกับ ${mates}` : "ประจำจุดนี้คนเดียว"}</p>
              <a href={mapsUrl(target.lat, target.lng)} target="_blank" rel="noreferrer"
                className="h-[52px] rounded-2xl bg-ink text-white font-semibold flex items-center justify-center gap-2 hover:bg-black">
                <Navigation size={17} />นำทางด้วย Google Maps
              </a>
            </>
          ) : (
            <p className="py-4 text-center text-mute">{day === "today" ? "วันนี้" : "พรุ่งนี้"}ไม่มีเวร</p>
          )}
        </div>
      )}
    </div>
  );
}
