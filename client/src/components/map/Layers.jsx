import { useEffect } from "react";
import { TileLayer, useMap } from "react-leaflet";

// แผนที่ OpenStreetMap (ไม่ต้องใช้ API key)
// ต้องแสดงเครดิต "© OpenStreetMap" ตามเงื่อนไขสัญญาอนุญาต ODbL จึงเก็บไว้แบบเล็ก ๆ
// ส่วน "Leaflet" + ธง (prefix) ไม่บังคับ เอาออกได้
export default function Layers() {
  const map = useMap();
  useEffect(() => { map.attributionControl?.setPrefix(false); }, [map]);
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}
