import { useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Card } from "../../../components/ui/card";

export default function ProjectBasicInfoCard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    if (endDate && newStart > endDate) {
      setEndDate("");
    }
  };

  return (
    <Card className="py-20 px-8 md:px-20 w-full flex items-center justify-center">
      <div className="w-full max-w-[800px] flex flex-col gap-12">
        
        {/* Top Spacer */}
        <div className="h-1" />

        {/* Logo Upload */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-8">
          {/* Logo Preview */}
          <div className="relative shrink-0 w-[160px] h-[160px] rounded-2xl bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-5xl font-bold text-white">
              UN
            </span>

            <button type="button"
              className=" absolute bottom-3 right-3 w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center" >
              <Camera className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Upload Area */}
          <div className="flex-1 w-full">
            <p
              className="text-lg font-semibold mb-3"
              style={{
                color: "var(--color-text-primary)",
              }}>
              Upload project logo
            </p>

            <div className="border-2 border-dashed rounded-xl h-[160px] flex flex-col items-center justify-center gap-4 cursor-pointer transition hover:bg-gray-50"
              style={{
                borderColor: "var(--color-border)",
              }} >
              <Upload className="w-12 h-12 text-gray-500" />

              <p
                className="text-lg"
                style={{
                  color: "var(--color-text-secondary)",
                }}
              >
                Click to upload or drag and drop
              </p>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT SIDE */}
          <div className="flex flex-col gap-6">
            {/* Project Name */}
            <div className="flex flex-col gap-3">
            <label className="text-base font-semibold">
              Project Name
            </label>

            <input type="text"
              placeholder="Enter project name"
              className="h-14 rounded-xl border px-4 text-base outline-none "/>
          </div>

          {/* Client Name */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold">
              Client Name
            </label>

            <input type="text"
              placeholder="Enter client name"
              className="h-14 rounded-xl border px-4 text-base outline-none "/>
          </div>

          {/* Team Size */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold">
              Team Size
            </label>

            <input type="number"
              placeholder="Enter team size"
              className="h-14 rounded-xl border px-4 text-base outline-none"/>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-col gap-6">
          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-base font-semibold">
                Start Date
              </label>

              <input 
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className=" h-14 rounded-xl border px-4 text-base outline-none"/>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-base font-semibold">
                End Date
              </label>

              <input 
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-14 rounded-xl border px-4 text-base outline-none"/>
            </div>
          </div>

          {/* Allocation */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold">
              Allocation %
            </label>

            <input type="number"
              placeholder="Enter allocation %"
              className=" h-14 rounded-xl border px-4 text-base outline-none"/>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold">
              Billing Budget (ZAR/hr)
            </label>

            <input type="number"
              placeholder="R 0"
              className="h-14 rounded-xl border px-4 text-base outline-none"/>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-3 w-full">
        <label className="text-base font-semibold">
          Description
        </label>

        <textarea
          placeholder="Enter project description"
          className="min-h-[150px] rounded-xl border p-4 text-base outline-none resize-none"/>
      </div>

      {/* Bottom Spacer */}
      <div className="h-1" />
      </div>
    </Card>
  );
}