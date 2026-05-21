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
    const [dateError, setDateError] = useState("");

    const formatDateInput = (value: string) => {
        const v = value.replace(/\D/g, "");
        if (v.length >= 5) {
            return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)}`;
        } else if (v.length >= 3) {
            return `${v.slice(0, 2)}/${v.slice(2)}`;
        }
        return v;
    };

    const parseDate = (dateStr: string) => {
        const parts = dateStr.split("/");
        if (parts.length === 3 && parts[2].length === 4) {
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        return null;
    };

    const parseDate = (dateStr: string) => {
        const parts = dateStr.split("/");
        if (parts.length === 3 && parts[2].length === 4) {
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        return null;
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = formatDateInput(e.target.value);
        setStartDate(newStart);
        if (dateError) setDateError("");

        const parsedStart = parseDate(newStart);
        const parsedEnd = parseDate(endDate);

        // Automatically clear end date if start date is pushed past it
        if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
            setEndDate("");
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = formatDateInput(e.target.value);
        setEndDate(newEnd);
        if (dateError) setDateError("");
    };

    const handleAdd = () => {
        if (!jobTitle.trim() || !companyName.trim()) return;

        const parsedStart = parseDate(startDate);
        const parsedEnd = parseDate(endDate);
        
        if (startDate && !parsedStart) {
            setDateError("Please enter a valid Start Date (DD/MM/YYYY)");
            return;
        }
        if (endDate && !parsedEnd) {
            setDateError("Please enter a valid End Date (DD/MM/YYYY)");
            return;
        }
        if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
            setDateError("End date cannot be before start date");
            return;
        }

        onAdd({
            jobTitle,
            companyName,
            jobType,
            workModel,
            startDate,
            endDate,
            description,
        });
        setJobTitle("");
        setCompanyName("");
        setJobType("");
        setWorkModel("");
        setStartDate("");
        setEndDate("");
        setDescription("");
        setDateError("");
    };

    return (
        <Card className="p-12 h-full w-full flex items-start justify-center">
            <div className="w-full max-w-[800px] flex flex-col h-full">
                <div className="h-6" />

            <h2 
                className="text-3xl font-bold mb-8"
                style={{ color: "var(--color-primary)" }}>
                    Experience
            </h2>
            <div className="h-6" />

            <div className="space-y-6 flex-1 gap-6 flex flex-col">
                    <div className="flex flex-col gap-3">
                        <label htmlFor="job-title" className="text-base font-semibold">
                            Job Title
                        </label>

                        <Input id="job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Enter job title" />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="company-name" className="text-base font-semibold">
                            Company/Organisation Name
                        </label>

                        <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter company name" />
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="space-y-2">
                            <label htmlFor="job-type" className="text-base font-semibold">
                                Job Type
                            </label>
                            <Input id="job-type" value={jobType} onChange={(e) => setJobType(e.target.value)} placeholder="Full-time" />
                        </div>

                        <div className="flex flex-col gap-3">
                            <label htmlFor="work-model" className="text-base font-semibold">
                                Work Model
                            </label>
                            <select
                                id="work-model"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                                value={workModel}
                                onChange={(e) => setWorkModel(e.target.value)}
                            >
                                <option value="" disabled>Select work model</option>
                                <option value="On-site">On-site</option>
                                <option value="Remote">Remote</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                            <label htmlFor="start-date" className="text-base font-semibold">
                                Start Date
                            </label>
                            <Input 
                                id="start-date" 
                                type="text"
                                placeholder="DD/MM/YYYY"
                                maxLength={10}
                                value={startDate}
                                onChange={handleStartDateChange}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <label htmlFor="end-date" className="text-base font-semibold">
                                End Date
                            </label>
                            <Input 
                                id="end-date" 
                                type="text"
                                placeholder="DD/MM/YYYY"
                                maxLength={10}
                                value={endDate}
                                onChange={handleEndDateChange}
                            />
                        </div>
                    </div>
                    {dateError && <span className="text-red-500 text-sm">{dateError}</span>}

                    <div className="flex flex-col gap-3">
                        <label htmlFor="description" className="text-base font-semibold">
                            Job Description
                        </label>

                        <textarea 
                            id="description" 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your role and responsibilities" 
                            className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400" 
                        />
                    </div>
            </div>

            <div className="h-6" />
            <Button onClick={handleAdd} className="self-end h-8 w-30 px-6 text-sm font-medium rounded" style={{
                backgroundColor:
                "var(--color-primary)",
            }}>
                Add Experience
            </Button>
            <div className="h-6" />
            </div>
        </Card>
    );
}
