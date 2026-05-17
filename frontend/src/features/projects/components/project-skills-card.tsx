import { useState } from "react";
import { Card } from "../../../components/ui/card";

export default function SkillsCard() {
 const [isMandatory, setIsMandatory] = useState(false);
  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
        
      <div className="w-full max-w-[440px] flex flex-col h-full">
        <div className="h-6" />
      <h2 className="text-3xl font-bold mb-8"
        style={{
          color: "var(--color-primary)",
        }}>
        Add Skills
      </h2>
        <div className="h-6" />
      <div className="flex flex-col gap-6 flex-1">
        {/* Skill Name */}
        <div className="flex flex-col gap-3">
          <label className="text-base font-semibold">
            Skill Name
          </label>
          <input type="text"
            placeholder=""
            className="h-14 rounded border px-4 outline-none"/>
        </div>

        {/* Competency */}
        <div className="flex flex-col gap-3">
          <label className="text-base font-semibold">
            Competency
          </label>
          <select
            className=" h-14 rounded border px-4 outline-none " defaultValue="">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        {/* Years */}
        <div className="flex flex-col gap-3">
          <label className="text-base font-semibold">
            Years of Experience
          </label>
          <input
            type="number"
            placeholder="Years of experience"
            className="
              h-14
              rounded
              border
              px-4
              outline-none
            "
          />
        </div>

        {/* Mandatory */}
        <div className="flex items-center gap-4">
        <button type="button"
            onClick={() =>setIsMandatory(!isMandatory)}
            className={`relative w-14 h-8 rounded-full transition-colors
            ${isMandatory? "bg-[var(--color-primary)]" : "bg-gray-300"}`}
        >
            <div
            className={` absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform
                ${isMandatory? "translate-x-6" : "translate-x-1"}`}
            />
        </button>

        <label className="text-base font-semibold">
            Is mandatory
        </label>
        </div>

        {/* Add Button */}
        <button
          type="button"
          className="
            h-14 rounded text-white font-semibold text-lg mt-2"
          style={{
            backgroundColor:
              "var(--color-primary)",
          }}
        >
          Add Skill
        </button>

        {/* Skills Table */}
        <div className="mt-6 border-t pt-6">
          <div className="grid grid-cols-3 text-sm font-semibold mb-4">
            <span>Skill</span>
            <span>Competency</span>
            <span>Years</span>
          </div>

          <div
            className="
              grid
              grid-cols-3
              py-4
              border-t
              text-base
            "
          >
            <span>Java</span>
            <span>Intermediate</span>
            <span>3</span>
          </div>
        </div>

        {/* Done Button */}
        <div className="mt-auto flex justify-end">
            <button className=" h-16 w-48 text-lg rounded font-semibold transition bg-gray-50 hover:bg-gray-100"
              style={{
                color:
                  "var(--color-primary)",
              }}
            onClick={() => console.log("Skills saved")}
          >
            Done
          </button>
        </div>
        <div className="h-6" />
      </div>
      </div>
    </Card>
  );
}