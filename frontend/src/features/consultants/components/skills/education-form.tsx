import { useState, useEffect } from "react";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import EducationTable from "./consultant-education-table";
import type { Education } from "./consultant-education-table";
import { Upload, Trash2 } from "lucide-react";
import { AttachmentDisplay } from "../../../../components/shared/attachment-display";
import { formatDateInput, parseDate, validateDateRange } from "../../utils/date.utils";
import DateField from "../../../../components/shared/date-picker";

const sanitizeText = (text: string) => text.replace(/[^a-zA-Z0-9\s.,'-]/g, "");
const sanitizeDate = (text: string) => text.replace(/[^\d/]/g, "");

interface CertificateUploadFieldProps {
    readonly uploadedFile: File | undefined;
    readonly onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    readonly onClearFile: () => void;
}

function CertificateUploadField({ uploadedFile, onFileUpload, onClearFile }: CertificateUploadFieldProps) {
    return (
        <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Certificate upload</span>
            <label
                htmlFor="cert-upload"
                className="flex flex-col items-center justify-center gap-3 p-8 px-6 py-2 h-28 rounded-lg border border-dashed cursor-pointer transition-colors duration-200"
                style={{
                    borderColor: "var(--color-border)"
                }}

            >
                <Upload size={24} className="text-gray-400" />

                <span
                    className="text-white bg-brand-blue font-medium text-sm  w-20 rounded-xl inline-flex items-center  justify-center"
                >
                    Choose file
                </span>
                <span
                    className="text-sm text-gray-500"
                >
                    {uploadedFile ? uploadedFile.name : "no file chosen"}
                </span>

                <Input
                    id="cert-upload"
                    type="file"
                    accept=".pdf,.jpg,.png"
                    className="hidden"
                    onChange={onFileUpload}
                />
            </label>

            {uploadedFile && (
                <div className="flex items-end gap-2 mt-2">
                    <div className="flex-1">
                        <AttachmentDisplay attachmentName={uploadedFile.name} />
                    </div>


                    <Button
                        variant="secondary"
                        onClick={onClearFile}
                        className="p-3 h-[62px] w-15 rounded-xl border flex items-center"
                        style={{
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            fontSize: "14px",
                            padding: "6px 12px",
                        }}
                        title="Remove attachment"
                    >
                        <Trash2 size={18} />
                    </Button>
                </div>

            )}

        </div>
    );
}

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
    const [uploadedFile, setUploadedFile] = useState<File | undefined>();

    const handleClearFile = () => {
        setUploadedFile(undefined);
        const input = document.getElementById("cert-upload") as HTMLInputElement;
        if (input) input.value = "";
    };

    const formatDateToString = (date: Date | null): string => {
        if (!date) return "";

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        setUploadedFile(file);
    };

    const handleAddEducation = () => {
        if (!institutionName.trim() || !qualification.trim() || !endDate) return;

        const validationError = validateDateRange(startDate, endDate);
        if (validationError) {
            setDateError(validationError);
            return;
        }

        const parsedEnd = parseDate(endDate);

        // Call upload function here before adding the file to list 

        setEducationList((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                institution: institutionName,
                qualification: qualification,
                endYear: parsedEnd ? parsedEnd.getFullYear() : new Date().getFullYear(),
                fileName: uploadedFile?.name,
            },
        ]);


        handleClearFile();

        setInstitutionName("");
        setQualification("");
        setStartDate("");
        setEndDate("");
        setDateError("");

    };

    useEffect(() => {


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

        const sanitizedList = educationList.map(edu => ({
            ...edu,
            institution: sanitizeText(edu.institution),
            qualification: sanitizeText(edu.qualification),
        }));
        sessionStorage.setItem("education_list", JSON.stringify(sanitizedList));  //NOSONAR
    }, [educationList]);

    return (
        <Card className="p-8 h-full w-full flex items-start justify-center">
            <div className="w-full max-w-200 flex flex-col h-full">
                <div className="h-6" />
                <h2 className="text-3xl font-bold mb-8"
                    style={{ color: "var(--color-primary)" }}
                >
                    Education
                </h2>

                <div className="space-y-6 flex-1 gap-4 flex flex-col">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-3">
                            <DateField
                                id="start-date"
                                label="Start Date"
                                selected={parseDate(startDate)}
                                onChange={(date: Date | null) => {
                                    const formatted= formatDateToString(date);
                                    setStartDate(formatted);
                                    if (dateError) {
                                        setDateError("");
                                    }

                                    const parsedEnd= parseDate(endDate);
                                    if(date && parsedEnd && date > parsedEnd){
                                        setEndDate("");
                                    }
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <DateField
                                id="end-date"
                                label="End Date"
                                selected={parseDate(endDate)}
                                onChange={(date: Date | null) => {
                                    const formatted= formatDateToString(date);
                                    setEndDate(formatted);
                                    if (dateError) {
                                        setDateError("");
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {dateError && <span className="text-red-500 text-sm">{dateError}</span>}

                    <CertificateUploadField
                        uploadedFile={uploadedFile}
                        onFileUpload={handleFileUpload}
                        onClearFile={handleClearFile}
                    />

                    <div className="self-end bg-brand-blue! overflow-hidden rounded-xl">
                        <Button
                            variant="default"
                            onClick={handleAddEducation}
                            disabled={!institutionName.trim() || !qualification.trim() || !endDate}

                        >
                            Add Education
                        </Button>
                    </div>


                    <div className=" w-full">
                        <EducationTable
                            education={educationList}
                            onRemove={(id) => setEducationList(prev => prev.filter(e => e.id !== id))}

                        />
                    </div>
                    <div className="h-6" />


                </div>
            </div>
        </Card>
    );
}
