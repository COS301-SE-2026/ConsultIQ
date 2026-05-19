import { useState, useEffect } from "react";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import EducationTable from "./consultant-education-table";
import type { Education } from "./consultant-education-table";

const sanitizeInput = (input: string) => {
    if (!input) return "";
    return input.replace(/[&<>"'/]/g, (match) => {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            case '/': return '&#x2F;';
            default: return match;
        }
    });
};

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

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStartDate(newStart);
        if (endDate && newStart > endDate) {
            setEndDate("");
        }
    };

    const handleAddEducation = () => {
        if (!institutionName.trim() || !qualification.trim() || !endDate) return;

        setEducationList((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                institution: institutionName,
                qualification: qualification,
                endYear: new Date(endDate).getFullYear(),
            },
        ]);

        setInstitutionName("");
        setQualification("");
        setStartDate("");
        setEndDate("");
    };

    useEffect(() => {
        sessionStorage.setItem("education_institutionName", sanitizeInput(institutionName));
        sessionStorage.setItem("education_qualification", sanitizeInput(qualification));
        sessionStorage.setItem("education_startDate", sanitizeInput(startDate));
        sessionStorage.setItem("education_endDate", sanitizeInput(endDate));
    }, [institutionName, qualification, startDate, endDate]);

    useEffect(() => {
        const sanitizedList = educationList.map(edu => ({
            ...edu,
            institution: sanitizeInput(edu.institution),
            qualification: sanitizeInput(edu.qualification),
        }));
        sessionStorage.setItem("education_list", JSON.stringify(sanitizedList));
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
                        type="date" 
                        placeholder="Pick dates" 
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
                        type="date" 
                        placeholder="Pick dates" 
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                </div>
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