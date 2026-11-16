import React, { useDebugValue, useEffect, useState } from "react";
import PersonnelList from "./components/people/PersonnelList";
import Header from "./components/layout/Header";
import MapView from "./components/map/MapView";
import LocationsList from "./components/locations/LocationsList";
import axios from "axios";
import useDutyStore from "./store/useDutyStore";
import AddLocationModal from "./components/locations/AddLocationModal";

// rafce
const App = () => {
  // Js
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(null);
  const fetchAll = useDutyStore((state) => state.fetchAll);

  useEffect(() => {
    // fn body
    fetchAll();
  }, []);

  const onPick = (lat, lng) => {
    // fn body
    setPending({ lat, lng });
  };
  console.log(pending);
  return (
    <div className="flex h-screen bg-gray-100">
      <PersonnelList />

      <div className="flex flex-col flex-1">
        <Header adding={adding} setAdding={setAdding} />

        <div className="flex flex-1 overflow-hidden">
          <MapView adding={adding} onPick={onPick} />
          <LocationsList />
        </div>
      </div>

      {pending && (
        <AddLocationModal
          lat={pending.lat}
          lng={pending.lng}
          setAdding={setAdding}
          setPending={setPending}
        />
      )}
    </div>
  );
};

export default App;
