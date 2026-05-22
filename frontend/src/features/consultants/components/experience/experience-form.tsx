import { useState } from "react";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";

type Props = {
  onAdd: (exp: {
    jobTitle: string;
    companyName: string;
    jobType: string;
    workModel: string;
    startDate: string;
    endDate: string;
    description: string;
  }) => void;
};

export default function ExperienceForm({ onAdd }: Readonly<Props>) {
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobType, setJobType] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAdd = () => {
    const newErrors: Record<string, string> = {};
    if (!jobTitle.trim()) newErrors.jobTitle = "Job title is required.";
    if (!companyName.trim()) newErrors.companyName = "Company name is required.";
    if (!jobType) newErrors.jobType = "Job type is required.";
    if (!workModel) newErrors.workModel = "Work model is required.";
    if (!startDate) newErrors.startDate = "Start date is required.";
    if (!description.trim()) newErrors.description = "Description is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onAdd({
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      jobType,
      workModel,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : "",
      description: description.trim(),
    });

    setJobTitle("");
    setCompanyName("");
    setJobType("");
    setWorkModel("");
    setStartDate("");
    setEndDate("");
    setDescription("");
  };

  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[800px] flex flex-col h-full">
        <div className="h-6" />
        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Experience
        </h2>
        <div className="h-6" />

        <div className="space-y-6 flex-1 gap-6 flex flex-col">
          <div className="flex flex-col gap-3">
            <label htmlFor="job-title" className="text-base font-semibold">Job Title</label>
            <Input
              id="job-title"
              value={jobTitle}
              onChange={(e) => { setJobTitle(e.target.value); if (errors.jobTitle) setErrors((p) => ({ ...p, jobTitle: "" })); }}
              placeholder="Enter job title"
              className={errors.jobTitle ? "border-red-500" : ""}
            />
            {errors.jobTitle && <span className="text-red-500 text-sm">{errors.jobTitle}</span>}
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="company-name" className="text-base font-semibold">Company/Organisation Name</label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); if (errors.companyName) setErrors((p) => ({ ...p, companyName: "" })); }}
              placeholder="Enter company name"
              className={errors.companyName ? "border-red-500" : ""}
            />
            {errors.companyName && <span className="text-red-500 text-sm">{errors.companyName}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="job-type" className="text-base font-semibold">Job Type</label>
              <select
                id="job-type"
                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 ${errors.jobType ? "border-red-500" : "border-slate-200"}`}
                value={jobType}
                onChange={(e) => { setJobType(e.target.value); if (errors.jobType) setErrors((p) => ({ ...p, jobType: "" })); }}
              >
                <option value="" disabled>Select job type</option>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="FREELANCE">Freelance</option>
              </select>
              {errors.jobType && <span className="text-red-500 text-sm">{errors.jobType}</span>}
            </div>

            <div className="flex flex-col gap-3">
              <label htmlFor="work-model" className="text-base font-semibold">Work Model</label>
              <select
                id="work-model"
                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 ${errors.workModel ? "border-red-500" : "border-slate-200"}`}
                value={workModel}
                onChange={(e) => { setWorkModel(e.target.value); if (errors.workModel) setErrors((p) => ({ ...p, workModel: "" })); }}
              >
                <option value="" disabled>Select work model</option>
                <option value="ONSITE">On-site</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
              {errors.workModel && <span className="text-red-500 text-sm">{errors.workModel}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="start-date" className="text-base font-semibold">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); if (errors.startDate) setErrors((p) => ({ ...p, startDate: "" })); }}
                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 ${errors.startDate ? "border-red-500" : "border-slate-200"}`}
              />
              {errors.startDate && <span className="text-red-500 text-sm">{errors.startDate}</span>}
            </div>

            <div className="flex flex-col gap-3">
              <label htmlFor="end-date" className="text-base font-semibold">
                End Date <span className="text-slate-400 font-normal">(leave blank if current)</span>
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="description" className="text-base font-semibold">Job Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors((p) => ({ ...p, description: "" })); }}
              placeholder="Describe your role and responsibilities"
              className={`flex min-h-[100px] w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 ${errors.description ? "border-red-500" : "border-slate-200"}`}
            />
            {errors.description && <span className="text-red-500 text-sm">{errors.description}</span>}
          </div>
        </div>

        <div className="h-6" />
        <Button
          onClick={handleAdd}
          className="self-end h-8 w-30 px-6 text-sm font-medium rounded"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Add Experience
        </Button>
        <div className="h-6" />
      </div>
    </Card>
  );
}