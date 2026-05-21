import { useState, useEffect } from "react";
import { getConsultantProfileById, getConsultantProfileByUserId } from "../api/consultants.api";


interface ExperienceDto {
  id?: string;
  companyname: string;
  jobTitle: string;
  jobType: string;
  startDate: string;
  endDate?: string;
  roleDescription?: string;
  workModel?: string;
}

interface SkillDto {
  skillName: string;
  competencyLevel: string;
  yearsExperience?: number;
}

interface CertificateDto {
  id?: string;
  issuingBody: string;
  title: string;
  startDate?: string;
  endDate?: string;
  uploadedAt: string;
}

export interface ConsultantProfileDto {
  id: string;
  fullName?: string;
  availability?: string;
  email: string;
  phoneNumber?: string;
  idNumber?: string;
  nationality?: string;
  location?: string;
  experience?: ExperienceDto[];
  skills?: SkillDto[];
  certificates?: CertificateDto[];
}


const mapDtoToProfile = (data: ConsultantProfileDto) => {
  const nameParts = data.fullName ? data.fullName.split(" ") : ["", ""];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    id: data.id,
    firstName,
    lastName,
   status: (data.availability === "AVAILABLE" ? "Available" : "Unavailable") as "Available" | "Unavailable",
    email: data.email,
    phone: data.phoneNumber || "Not Provided",
    idNumber: data.idNumber || "Not Provided",
    nationality: data.nationality || "Not Provided",

    
   
    address1: data.location || "Not Provided",
    address2: "",
    suburb: "",
    city:  "",
    province: "",
    postalCode: "",

    experience: (data.experience || []).map((exp, index: number) => ({
      id: exp.id || `exp-${index}`,
      company: exp.companyname,
      jobTitle: exp.jobTitle,
      jobType: exp.jobType,
      startDate: new Date(exp.startDate).toLocaleDateString("en-ZA", { 
        month: "long", 
        year: "numeric" 
      }),
      endDate: exp.endDate 
        ? new Date(exp.endDate).toLocaleDateString("en-ZA", { 
            month: "long", 
            year: "numeric" 
          }) 
        : "Present",
      roleDescription: exp.roleDescription || "No description provided.",
      workModel: exp.workModel || "ONSITE",
    })),

    skills: (data.skills || []).map((s) => ({
      name: s.skillName,
      competencyLevel: s.competencyLevel as any, 
      yearsOfExperience: s.yearsExperience || 0,
    })),

    education: (data.certificates || []).map((cert, index: number) => ({
      id: cert.id || `edu-${index}`,
      institution: cert.issuingBody,
      qualification: cert.title,
      startDate: cert.startDate 
        ? new Date(cert.startDate).toLocaleDateString("en-ZA", { month: "long", year: "numeric" }) 
        : new Date(cert.uploadedAt).toLocaleDateString("en-ZA", { month: "long", year: "numeric" }),
      endDate: cert.endDate 
        ? new Date(cert.endDate).toLocaleDateString("en-ZA", { month: "long", year: "numeric" }) 
        : new Date(cert.uploadedAt).toLocaleDateString("en-ZA", { month: "long", year: "numeric" }),
    })),
  };
};

export type MappedConsultantProfile = ReturnType<typeof mapDtoToProfile>;

export function useFetchConsultantProfile(
  targetConsultantId: string | undefined, 
  loggedInUserId: string | undefined
) {
  // Use the inferred map type instead of "any"
  const [profile, setProfile] = useState<MappedConsultantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
      
        let rawData: ConsultantProfileDto | null = null;

        if (targetConsultantId) {
          rawData = await getConsultantProfileById(targetConsultantId);
        } else if (loggedInUserId) {
          rawData = await getConsultantProfileByUserId(loggedInUserId);
        } else {
          throw new Error("No usable identifier found to load profile.");
        }

        if (rawData) {
          setProfile(mapDtoToProfile(rawData));
        }
        setError(null);
      } catch (err) {
        console.error("Profile Fetch Hook Error:", err);
        
        const errorMessage = err instanceof Error ? err.message : "Could not load profile details.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [targetConsultantId, loggedInUserId]);

  return { profile, isLoading, error };
}