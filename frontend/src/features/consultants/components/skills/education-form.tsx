import { useState, useEffect } from "react";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "../../../../components/ui/select";
import { Button } from "../../../../components/ui/button";
import EducationTable from "./consultant-education-table";
import type { Education } from "./consultant-education-table";
import { Upload, Trash2 } from "lucide-react";
import { AttachmentDisplay } from "../../../../components/shared/attachment-display";
import {  parseDate, validateDateRange } from "../../utils/date.utils";
import DateField from "../../../../components/shared/date-picker";

const sanitizeText = (text: string) => text.replace(/[^a-zA-Z0-9\s.,'-]/g, "");
const sanitizeDate = (text: string) => text.replace(/[^\d/]/g, "");

const commonSAInstitutions= [
    "University of Pretoria",
    "University of Cape Town",
    "Universitry of the Witwatersrand",
    "Stellenbosch University",
    "University of KwaZulu-Natal",
    "University of Johannesburg",
    "Rhodes University",
    "University of Western Cape",
    "Nelson Mandela University",
    "University of South Africa",
    "North-West University",
    "Nelson Mandela University",
    "University of Limpopo",
    "Tshwane University of Technology",
    "University of Free State",
];

interface CertificateUploadFieldProps{
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
    const [qualification, setQualification] = useState(() => sessionStorage.getItem("education_qualification") || "");
    const [selectedInstitution, setSelectedInstitution] =useState(() => sessionStorage.getItem("education_selectedInstitution") || "");
    const [customInstitution, setCustomInstitution] =useState(() => sessionStorage.getItem("education_customInstitution") || "");
    const currInstitution= selectedInstitution === "Other" ? customInstitution : selectedInstitution;
    const [startDate, setStartDate] = useState(() => sessionStorage.getItem("education_startDate") || "");
    const [endDate, setEndDate] = useState(() => sessionStorage.getItem("education_endDate") || "");
    const [dateError, setDateError] = useState("");
    const [uploadedFile, setUploadedFile] = useState<File | undefined>();
    const isAddButtonDisabled = !currInstitution.trim() || !qualification.trim() || !endDate;   


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
        if (!currInstitution.trim() || !qualification.trim() || !endDate) return;

        const validationError = validateDateRange(startDate, endDate);
        if (validationError) {
            setDateError(validationError);
            return;
        }

        const parsedEnd = parseDate(endDate);
        const finalInstitutionName= selectedInstitution === "Other" ? customInstitution: selectedInstitution;
        if(!finalInstitutionName.trim()) return;

        // Call upload function here before adding the file to list 

        setEducationList((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                institution: finalInstitutionName,
                qualification: qualification.trim(),
                endYear: parsedEnd ? parsedEnd.getFullYear() : new Date().getFullYear(),
                fileName: uploadedFile?.name,
            },
        ]);


        handleClearFile();

        setSelectedInstitution("");
        setCustomInstitution("");
        setQualification("");
        setStartDate("");
        setEndDate("");
        setDateError("");

    };

    useEffect(() => {


        sessionStorage.setItem("education_selectedInstitution", selectedInstitution); //NOSONAR        
        sessionStorage.setItem("education_customInstitution", sanitizeText(customInstitution)); //NOSONAR

        const sanitizedQualification = sanitizeText(qualification);
        sessionStorage.setItem("education_qualification", sanitizedQualification); //NOSONAR

        const finalInstitutionName= selectedInstitution === "Other" ? customInstitution : selectedInstitution;
        sessionStorage.setItem("education_institutionName", sanitizeText(finalInstitutionName)); //NOSONAR

        const sanitizedStartDate = sanitizeDate(startDate);
        sessionStorage.setItem("education_startDate", sanitizedStartDate); //NOSONAR

        const sanitizedEndDate = sanitizeDate(endDate);
        sessionStorage.setItem("education_endDate", sanitizedEndDate); //NOSONAR
    }, [selectedInstitution, customInstitution, qualification, startDate, endDate]);

    useEffect(() => {

        const sanitizedList = educationList.map(edu => ({
            ...edu,
            institution: sanitizeText(edu.institution),
            qualification: sanitizeText(edu.qualification),
        }));
        sessionStorage.setItem("education_list", JSON.stringify(sanitizedList));  //NOSONAR
    }, [educationList]);

    return (
        <Card className="px-6 py-6 h-full w-full flex items-start rounded-2xl justify-center">
            <div className="w-full max-w-200 flex flex-col h-full">
                <h2 className="text-3xl font-bold mb-8 mt-6"
                    style={{ color: "var(--color-primary)" }}
                >
                    Education
                </h2>
            
            <div className="space-y-6 flex-1 flex flex-col">
            <div className= "grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                    <label htmlFor="selected-institution" className="text-sm font-medium">
                        Institution Name
                    </label>

                {selectedInstitution === "Other" ?(
                    <div className= "flex flex-col gap-2">
                        <input id="custom-institution"
                        placeholder="Type institution name"
                        value ={customInstitution}
                        onChange= {(e) => setCustomInstitution(e.target.value)}
                        />
                        <Button variant="ghost" onClick={() => setSelectedInstitution("")} className="shrink-0">
                            Back
                        </Button>
                    </div>
                ):(
                <Select
                    value={selectedInstitution}
                    onValueChange= {(value) =>{setSelectedInstitution(value);
                    if(value !== "Other"){ setCustomInstitution("");}
                    }}
                    >
                        <SelectTrigger id="selected-institution">
                            <SelectValue placeholder="Select an institution"/>
                        </SelectTrigger>
                        <SelectContent>
                            {commonSAInstitutions.map((institution) =>(
                                <SelectItem key={institution} value={institution}>
                                    {institution}
                                </SelectItem>
                            ))}
                            <SelectItem value="Other">Other (please specify)</SelectItem>
                        </SelectContent>
                    </Select>
                )}
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

                
                <Button 
                    variant="default"
                    onClick={handleAddEducation}
                    disabled={isAddButtonDisabled}
                    className="self-end flex items-center justify-center px-6 text-sm font-medium rounded-xl bg-brand-blue transition disabled:opacity-50"
                >
                    Add Education
                </Button>
             
                <div className=" w-full mb-6">
                    <EducationTable 
                        education={educationList}
                        onRemove={(id) => setEducationList(prev => prev.filter(e => e.id !== id ))}
                    
                    />
                </div>                

                </div>
            </div>
        </Card>
    );
}
