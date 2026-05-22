/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import type {
  CreateConsultantSkillPayload,
  CreateCertificationPayload,
} from "../services/consultant.service";

// Extended with id for UI list rendering and stripped before API call
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

export interface ProfileState {
  consultantUserId: string;
  idNumber: string;
  phone: string;
  nationality: string;
  location: string;
  availability: "AVAILABLE" | "UNAVAILABLE" | "ON_LEAVE";
  costToCompany: number;
  skills: CreateConsultantSkillPayload[];
  experiences: ExperienceItem[];
  certifications: CreateCertificationPayload[];
}

interface ConsultantProfileContextValue {
  profileData: ProfileState;
  updateProfileData: (data: Partial<ProfileState>) => void;
}

const defaultState: ProfileState = {
  consultantUserId: "",
  idNumber: "",
  phone: "",
  nationality: "",
  location: "",
  availability: "AVAILABLE",
  costToCompany: 0,
  skills: [],
  experiences: [],
  certifications: [],
};

const ConsultantProfileContext = createContext<ConsultantProfileContextValue | undefined>(undefined);

export const ConsultantProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profileData, setProfileData] = useState<ProfileState>(() => {
    const saved = sessionStorage.getItem("consultant_profile_draft");
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  });

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