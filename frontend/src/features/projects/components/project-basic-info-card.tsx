import { Camera, Upload } from "lucide-react";
import { Card } from "../../../components/ui/card";
import type { ProjectFormData } from "../pages/project-specification-page";

interface ProjectBasicInfoCardProps {
  data: ProjectFormData;
  errors?: Partial<Record<keyof ProjectFormData, string>>;
  readonly onChange: (field: keyof ProjectFormData, value: ProjectFormData[keyof ProjectFormData]) => void;
}

export default function ProjectBasicInfoCard({ data, errors = {}, onChange }: ProjectBasicInfoCardProps) {

  // Get today's date in 'YYYY-MM-DD' format
  const today = new Date().toISOString().split("T")[0];

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;


    if (newStart && newStart < today) {
      return;
    }

    onChange("startDate", newStart);


    if (data.endDate && newStart > data.endDate) {
      onChange("endDate", "");
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    const minimumAllowedDate = data.startDate || today;


    if (newEnd && newEnd < minimumAllowedDate) {
      return;
    }

    onChange("endDate", newEnd);
  };


  const getInputClass = (fieldName: keyof ProjectFormData) =>
    `h-14 rounded-xl border px-4 text-base outline-none transition-colors ${errors[fieldName] ? "border-red-500 focus:border-red-600" : "focus:border-[var(--color-primary)]"
    }`;

  return (
    <Card className="py-20 px-8 md:px-20 w-full flex items-center justify-center">
      <div className="w-full max-w-[800px] flex flex-col gap-12">
        <div className="h-1" />

        {/* Logo Upload */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-8">
          <div className="relative shrink-0 w-[160px] h-[160px] rounded-2xl bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-5xl font-bold text-white">UN</span>
            <button
              type="button"
              className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center"
            >
              <Camera className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          {/* Upload Area */}
          <div className="flex-1 w-full">
            <p className="text-lg font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
              Upload project logo
            </p>
            <div
              className="border-2 border-dashed rounded-xl h-[160px] flex flex-col items-center justify-center gap-4 cursor-pointer transition hover:bg-gray-50"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Upload className="w-12 h-12 text-gray-500" />
              <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                Click to upload or drag and drop
              </p>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT SIDE */}
          <div className="flex flex-col gap-6">
            {/* Project Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="projectName" className="text-base font-semibold">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="projectName"
                placeholder="Enter project name"
                value={data.projectName}
                maxLength={100}
                onChange={(e) => onChange("projectName", e.target.value)}
                className={getInputClass("projectName")}
              />
              {errors.projectName && <span className="text-sm text-red-500">{errors.projectName}</span>}
            </div>

            {/* Client Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="clientName" className="text-base font-semibold">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="clientName"
                placeholder="Enter client name"
                value={data.clientName}
                maxLength={100}
                onChange={(e) => onChange("clientName", e.target.value)}
                className={getInputClass("clientName")}
              />
              {errors.clientName && <span className="text-sm text-red-500">{errors.clientName}</span>}
            </div>

            {/* Team Size */}
            <div className="flex flex-col gap-2">
              <label htmlFor="teamSize" className="text-base font-semibold">
                Team Size
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                id="teamSize"
                placeholder="Enter team size"
                value={data.teamSize === undefined ? "" : data.teamSize}
                onChange={(e) => {
                  // 1. Strip out absolutely everything that is not a digit 0-9
                  const numericString = e.target.value.replace(/\D/g, "");

                  // 2. Allow the user to clear the input completely
                  if (numericString === "") {
                    onChange("teamSize", ""); // or 0
                    return;
                  }

                  // 3. Convert to integer and clamp the value between 0 and 50
                  let val = parseInt(numericString, 10);
                  if (val > 50) val = 50;

                  onChange("teamSize", val);
                }}
                className={getInputClass("teamSize")}
              />
              {errors.teamSize && <span className="text-sm text-red-500">{errors.teamSize}</span>}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Start Date */}
              <div className="flex flex-col gap-2">
                <label htmlFor="startDate" className="text-base font-semibold">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={data.startDate}
                  min={today}
                  onChange={handleStartDateChange}
                  className={getInputClass("startDate")}
                />
                {errors.startDate && <span className="text-sm text-red-500">{errors.startDate}</span>}
              </div>

              {/* End Date */}
              <div className="flex flex-col gap-2">
                <label htmlFor="endDate" className="text-base font-semibold">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={data.endDate}
                  min={data.startDate || today}
                  onChange={handleEndDateChange}
                  className={getInputClass("endDate")}
                />
                {errors.endDate && <span className="text-sm text-red-500">{errors.endDate}</span>}
              </div>
            </div>

            {/* Budget */}
            <div className="flex flex-col gap-2">
              <label htmlFor="budget" className="text-base font-semibold">
                Billing Budget
              </label>
              <input
                type="number"
                id="budget"
                placeholder="R 0"
                value={data.budget || ""}
                min="0"
                onChange={(e) => {
                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                  onChange("budget", val);
                }}
                className={getInputClass("budget")}
              />
              {errors.budget && <span className="text-sm text-red-500">{errors.budget}</span>}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2 w-full">
          <label htmlFor="description" className="text-base font-semibold">
            Description
          </label>
          <textarea
            id="description"
            placeholder="Enter project description"
            value={data.description}
            maxLength={500}
            onChange={(e) => onChange("description", e.target.value)}
            className={`min-h-[150px] rounded-xl border p-4 text-base outline-none resize-none transition-colors ${errors.description ? "border-red-500" : "focus:border-[var(--color-primary)]"
              }`}
          />
          {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
        </div>

        <div className="h-1" />
      </div>
    </Card>
  );
}