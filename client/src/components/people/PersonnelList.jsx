// rafce
import React from "react";
import useDutyStore from "../../store/useDutyStore";
import { CircleUser, Clock } from "lucide-react";

const PersonnelList = () => {
  //  zustand
  const personnel = useDutyStore((state) => state.personnel);
  // console.log(personnel);

  const onDragStart = (e, personId) => {
    // console.log(e, personId);
    e.dataTransfer.setData("text/plain",personId)
  };

  return (
    <div className="w-80 bg-white overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex item-center gap-3 mb-2">
          <CircleUser className="text-blue-500 size={40}" />
          <h2 className="text-xl font-bold text-gray-800">
            รายชื่อเจ้าหน้าที่
          </h2>
        </div>
        <p className="text-sm text-gray-600">ลากไปยังจุด</p>
      </div>

      <div className="p-4 space-y-2">
        {personnel.map((item) => {
          return (
            <div
              key={item.id}
              draggable = {true}
              onDragStart={(e) => onDragStart(e,item.id)}
              className="flex items-center gap-3 p-3 bg-blue-200 border
         border-blue-300 border rounded-lg cursor-move hover:shadow-lg 
         scale-105"
            >
              <div className="text-3xl">{item.avatar}</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{item.name}</div>
                <div className="text-xs text-gray-500">{item.position}</div>
              </div>
              <div className="text-gray-400">
                <Clock />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonnelList;
