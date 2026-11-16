// rafce
import React from "react";
import { MapContainer, Marker, Popup, Tooltip, useMapEvent, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Layers from "./Layers";
import useDutyStore from "../../store/useDutyStore";

const ClickToAdd = ({ adding,onPick }) => {
  // fn body
  useMapEvents({
    click(e) {
      // console.log(e.latlng)
      // map.flyTo(e.latlng)
      if (adding) onPick(e.latlng.lat,e.latlng.lng);
    },
  });
  return;
};

const MapView = ({ adding, onPick }) => {
   const locations = useDutyStore((s)=>s.locations);


  const center = [13, 100];
  
  
  return (
    <div className="flex-1">
      <MapContainer
        className="h-full"
        center={center}
        zoom={7}
        scrollWheelZoom={true}
      >
        <Layers />

        <ClickToAdd adding={adding} onPick={onPick} />

        {
          locations.map((item)=>{
            return <Marker 
            key={item.id}
            position={[item.lat,item.lng]}>

                 <Popup>
                  <div className="text-m">{item.name}</div>
                  <div className="text-m text-gray-500">{item.lat}
                    ,{item.lng}</div>
                 </Popup>
                <Tooltip direction="center">
                  {item.name}
                </Tooltip>
            </Marker>
          })
        }
      </MapContainer>
    </div>
  );
};

export default MapView;
