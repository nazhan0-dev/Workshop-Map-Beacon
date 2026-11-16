import { TileLayer } from "react-leaflet";

// แผนที่ OpenStreetMap (ไม่ต้องใช้ API key)
export default function Layers() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}
