import { Camera, Upload } from "lucide-react";
import { Card } from "../../../components/ui/card";
import type { ProjectFormData } from "../pages/project-specification-page";

interface ProjectBasicInfoCardProps {
  data: ProjectFormData;
  errors?: Partial<Record<keyof ProjectFormData, string>>;
  readonly onChange: (field: keyof ProjectFormData, value: ProjectFormData[keyof ProjectFormData]) => void;
}

const MAX_TEAM_SIZE = 50;
const MAX_BUDGET = 999999999;
const MIN_ALLOCATION = 10;
const MAX_ALLOCATION = 100;
const MAX_DESCRIPTION_LENGTH = 250;


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

  const teamSizeError =
    data.teamSize !== undefined && data.teamSize > MAX_TEAM_SIZE
      ? `Team size cannot exceed ${MAX_TEAM_SIZE} consultants.`
      : errors.teamSize;

  const budgetError =
    typeof data.budget === "number" && data.budget > MAX_BUDGET
      ? `Budget cannot exceed R${MAX_BUDGET.toLocaleString()}.`
      : errors.budget;

  const allocationError =
    typeof data.allocation === "number" && (data.allocation > MAX_ALLOCATION || data.allocation < MIN_ALLOCATION)
      ? `Allocation must be between ${MIN_ALLOCATION}% and ${MAX_ALLOCATION}%.`
      : errors.allocation;

  const descriptionLength = data.description?.length ?? 0;


  const getInputClass = (fieldName: keyof ProjectFormData,  hasError?: boolean) =>
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
                maxLength={4}
                id="teamSize"
                placeholder="Enter team size"
                value={data.teamSize === undefined ? "" : data.teamSize}
                onChange={(e) => {
                  const numericString = e.target.value.replace(/\D/g, "");

                  if (numericString === "") {
                    onChange("teamSize", ""); // or 0
                    return;
                  }
                  const val = parseInt(numericString, 10);
                  onChange("teamSize", val);
                }}
                className={getInputClass("teamSize", !!teamSizeError)}
              />
              {teamSizeError && <span className="text-sm text-red-500">{teamSizeError}</span>}
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
                type="text"
                inputMode="decimal"
                id="budget"
                placeholder="R 0"
                value={data.budget || ""}
                min="0"
                maxLength={12}
                onChange={(e) => {
                  const sanitizedVal= e.target.value.replace(/[^0-9.]/g,'').replace(/(\..*)./g,'$1');
                  const val= Number.parseFloat(sanitizedVal) || 0;
                  onChange("budget", val);
                }}
                className={getInputClass("budget", !!budgetError)}
              />
              {budgetError && <span className="text-sm text-red-500">{budgetError}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="allocation" className="text-base font-semibold">
                Consultant Allocation (%)
              </label>
              <input type="number"
              id="allocation"
              min={1}
              max={100}
              value={data.allocation}
              onChange={(e) =>{
                const value= Number(e.target.value);
                onChange("allocation", value);
              }}
              className={getInputClass("allocation")}/>

              <span className="text-sm text-slate-500">
                Percentage of a consultant's capacity required for this project.
              </span>

              {allocationError  &&(
                <span className="test-sm text-red-500">{errors.allocation}</span>
              )}
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
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(e) => onChange("description", e.target.value)}
            className={`min-h-[150px] rounded-xl border p-4 text-base outline-none resize-none transition-colors ${errors.description ? "border-red-500" : "focus:border-[var(--color-primary)]"
              }`}
          />
          <div className="flex justify-between items-center">
          {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
          <span
            className={`text-sm ml-auto ${descriptionLength >= MAX_DESCRIPTION_LENGTH ? "text-red-500" : "text-slate-500"
                }`}
            >
            {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
          </span>
          </div>
        </div>

        <div className="h-1" />
      </div>
    </Card>
  );
}