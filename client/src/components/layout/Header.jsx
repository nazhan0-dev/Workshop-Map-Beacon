// rafce
import { Plus, X } from "lucide-react";
import React from "react";

const Header = ({ adding, setAdding }) => {
  // Js
  // console.log(adding);

  return (
    <div
      className="p-4 bg-white shadow-md border-b
        border-gray"
    >
      <div className="flex justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">
          ระบบจัดการเวรประจำจุด
        </h2>
        <button
        onClick={() => setAdding((s) => !s)}
        className = {` flex items-center gap-2 p-2 rounded-lg
          ${
            adding 
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-green-500 text-white hover:bg-green-600"
          }
          `}
        >

          {
            adding
            ? (<> <X size={20}/> ยกเลิก </>)
            : (<><Plus size={20}/> เพิ่มจุดเวร </>)
          }
          
          </button>
           </div>

          {
            adding &&  <div className="mt-2 text-sm text-amber-600 bg-amber-100 p-4 rounded-lg border">
            คลิกบนแผนที่เพื่อเพิ่มต่ำแหนงเข้าเวร
          </div>
          }
         


     
    </div>
  );
};

export default Header;
