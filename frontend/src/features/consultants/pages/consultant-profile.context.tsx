import React, { createContext, useContext, useState, useEffect } from "react";
import type { CreateConsultantPayload } from "../services/consultant.service";

export interface ExperienceItem {
    id: string;
    jobTitle: string;
    companyName: string;
    jobType: string;
    workModel: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface ProfileState extends Omit<CreateConsultantPayload, "skills" | "certifications"> {
    skills: CreateConsultantPayload["skills"];
    certifications: CreateConsultantPayload["certifications"];
    experiences: ExperienceItem[];
}

interface ConsultantProfileContextValue {
    profileData: ProfileState;
    updateProfileData: (data: Partial<ProfileState>) => void;
}

const defaultState: ProfileState = {
    name: "",
    surname: "",
    email: "",
    location: "",
    availability: true,
    costToCompany: 0,
    skills: [],
    certifications: [],
    experiences: [],
};

const ConsultantProfileContext = createContext<ConsultantProfileContextValue | undefined>(undefined);

export const ConsultantProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Fetch everything from sessionStorage on load
    const [profileData, setProfileData] = useState<ProfileState>(() => {
        const saved = sessionStorage.getItem("consultant_profile_draft");
        return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    });

    // 2. Automatically sync to sessionStorage when changed
    useEffect(() => {
        sessionStorage.setItem("consultant_profile_draft", JSON.stringify(profileData));
    }, [profileData]);

    const updateProfileData = (data: Partial<ProfileState>) => {
        setProfileData((prev) => ({ ...prev, ...data }));
    };

    return (
        <ConsultantProfileContext.Provider value={{ profileData, updateProfileData }}>
            {children}
        </ConsultantProfileContext.Provider>
    );
};

export const useConsultantProfile = () => {
    const context = useContext(ConsultantProfileContext);
    if (!context) throw new Error("useConsultantProfile must be used within a ConsultantProfileProvider");
    return context;
};