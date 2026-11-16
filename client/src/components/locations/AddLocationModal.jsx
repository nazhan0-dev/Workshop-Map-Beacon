// rafce
import React, { useDebugValue, useState } from "react";
import useDutyStore from "../../store/useDutyStore";

const AddLocationModal = ({ lat, lng, setAdding, setPending }) => {
  //    Js

  const [name, setName] = useState("");

  const addLocation = useDutyStore((s)=>s.addLocation);


  const hdlAddLocation = async () => {
    await addLocation(lat, lng, name);
    setAdding(false);
    setPending(null);
  };
  const hdlCancel = () => {
    setAdding(false);
    setPending(null);
  };

  return (
    // top : 0 le
    <div
      className="fixed  inset-0 bg-black/50 flex
  items-center justify-center z-[9999]"
    >
      <div
        className="bg-white p-6 rounded-2xl shadow-2xl
    w-96"
      >
        <h3 className="text-xl mb-2">เพิ่มจุดเข้าเวรใหม่</h3>
        <div className="text-x text-gray-500 mb-2">
          Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
        </div>
        <input
          className="w-full border px-4 py-2 border-gray-300
         rounded-md mb-4 focus:outline-none focus:ring-blue-500 focus:ring-2"
          placeholder="input Name"
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex gap-4">
          <button
            className="flex-1 bg-purple-500 text-white py-3 rounded-lg hover:bg-green-500 disabled:cursor-not-allowed"
            onClick={hdlAddLocation}
            disabled={!name.trim()}
          >
            Save
          </button>

          <button
            className="flex-1 bg-gray-400 text-white rounded-lg hover:bg-red-500"
            onClick={hdlCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLocationModal;
