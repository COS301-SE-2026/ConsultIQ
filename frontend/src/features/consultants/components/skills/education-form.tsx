import { useState, useEffect } from "react";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import EducationTable from "./consultant-education-table";
import type { Education } from "./consultant-education-table";

export default function EducationForm() {
    const [educationList, setEducationList] = useState<Education[]>(() => {
        const saved = sessionStorage.getItem("education_list");
        if (saved) {
                return JSON.parse(saved);
        
        }
        return [];
    });
    const [institutionName, setInstitutionName] = useState(() => sessionStorage.getItem("education_institutionName") || "");
    const [qualification, setQualification] = useState(() => sessionStorage.getItem("education_qualification") || "");
    const [startDate, setStartDate] = useState(() => sessionStorage.getItem("education_startDate") || "");
    const [endDate, setEndDate] = useState(() => sessionStorage.getItem("education_endDate") || "");
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

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = formatDateInput(e.target.value);
        setStartDate(newStart);
        if (dateError) setDateError("");

        const parsedStart = parseDate(newStart);
        const parsedEnd = parseDate(endDate);

        if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
            setEndDate("");
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = formatDateInput(e.target.value);
        setEndDate(newEnd);
        if (dateError) setDateError("");
    };

    const handleAddEducation = () => {
        if (!institutionName.trim() || !qualification.trim() || !endDate) return;

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

        setEducationList((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                institution: institutionName,
                qualification: qualification,
                endYear: parsedEnd ? parsedEnd.getFullYear() : new Date().getFullYear(),
            },
        ]);

        setInstitutionName("");
        setQualification("");
        setStartDate("");
        setEndDate("");
        setDateError("");
    };

    useEffect(() => {
        const sanitizeText = (text: string) => text.replace(/[^a-zA-Z0-9\s.,'-]/g, "");
        const sanitizeDate = (text: string) => text.replace(/[^\d/]/g, "");

        const sanitizedInstitutionName = sanitizeText(institutionName);
        sessionStorage.setItem("education_institutionName", sanitizedInstitutionName); //NOSONAR

        const sanitizedQualification = sanitizeText(qualification);
        sessionStorage.setItem("education_qualification", sanitizedQualification); //NOSONAR

        const sanitizedStartDate = sanitizeDate(startDate);
        sessionStorage.setItem("education_startDate", sanitizedStartDate); //NOSONAR

        const sanitizedEndDate = sanitizeDate(endDate);
        sessionStorage.setItem("education_endDate", sanitizedEndDate); //NOSONAR
    }, [institutionName, qualification, startDate, endDate]);

    useEffect(() => {
        const sanitizeText = (text: string) => text.replace(/[^a-zA-Z0-9\s.,'-]/g, "");
        const sanitizedList = educationList.map(edu => ({
            ...edu,
            institution: sanitizeText(edu.institution),
            qualification: sanitizeText(edu.qualification),
        }));
        sessionStorage.setItem("education_list", JSON.stringify(sanitizedList));  //NOSONAR
    }, [educationList]);

    return (
        <Card className="p-12 h-full w-full flex items-start justify-center">
            <div className="w-full max-w-[800px] flex flex-col h-full">
                <div className="h-6" />
                <h2 className="text-3xl font-bold mb-8"
                    style={{ color: "var(--color-primary)" }}
                >
                    Education
                </h2>
            <div className="h-6" />
            <div className="space-y-6 flex-1 gap-6 flex flex-col">
                <div className="flex flex-col gap-3">
                    <label htmlFor="institution-name" className="text-sm font-medium">
                        Institution Name
                    </label>

                    <Input 
                        id="institution-name" 
                        placeholder="University Name" 
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <label htmlFor="qualification" className="text-sm font-medium">
                        Qualification
                    </label>

                    <Input 
                        id="qualification" 
                        placeholder="BSc Computer Science" 
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                    <label htmlFor="start-date" className="text-sm font-medium">
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
                    <label htmlFor="end-date" className="text-sm font-medium">
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
                <div className="h-6" />
                <Button 
                    onClick={handleAddEducation}
                    disabled={!institutionName.trim() || !qualification.trim() || !endDate}
                    className="self-end h-8 w-30 px-6 text-sm font-medium rounded transition disabled:opacity-50"
                    style={{
                        backgroundColor:
                        "var(--color-primary)",
                    }}
                >
                    Add Education
                </Button>
                <div className="h-6" />
                <div className="mt-8 w-full">
                    <EducationTable education={educationList} />
                </div>
                <div className="h-6" />
            </div>
            </div>
        </Card>
    );
}
