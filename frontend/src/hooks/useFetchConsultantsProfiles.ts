import { useState, useEffect } from "react";
import { getConsultantProfileById, getConsultantProfileByUserId } from "../features/consultants/services/consultant.service";
import { ApiError } from "../lib/api-client";


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
  confidenceLevel: number;
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
  fullName: string;
  availability?: string;
  email: string;
  phoneNumber?: string;
  idNumber?: string;
  nationality?: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode?: string;
  experience?: ExperienceDto[];
  skills?: SkillDto[];
  certificates?: CertificateDto[];
}


const mapDtoToProfile = (data: ConsultantProfileDto) => {


  return {
    id: data.id,
    fullName:data.fullName,
   status: (data.availability === "AVAILABLE" ? "Available" : "Unavailable") as "Available" | "Unavailable",
    email: data.email,
    phone: data.phoneNumber || "Not Provided",
    idNumber: data.idNumber || "Not Provided",
    nationality: data.nationality || "Not Provided",

    
   
    address1: data.addressLine1,
    address2: data.addressLine2 || "Not Provided",
    suburb: data.suburb || "Not Provided",
    city:  data.city,
    province: data.province,
    postalCode: data.postalCode || "Not provided",

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
      competencyLevel: s.competencyLevel as "BEGINNER" | "INTERMEDIATE" | "EXPERT",
      yearsOfExperience: s.yearsExperience || 0,
      confidenceLevel: s.confidenceLevel || 1,
    })),

    education: (data.certificates || []).map((cert, index: number) => ({
      id: cert.id || `edu-${index}`,
      institution: cert.issuingBody,
      qualification: cert.title,
      startDate: cert.startDate 
        ? new Date(cert.startDate).toISOString().split("T")[0]
        : new Date(cert.uploadedAt).toISOString().split("T")[0],
      endDate: cert.endDate 
        ? new Date(cert.endDate).toISOString().split("T")[0]
        : new Date(cert.uploadedAt).toISOString().split("T")[0],
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
  const [error, setError] = useState<Error | string | null>(null);
  const [notFound,setNotFound]= useState(false);

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
        setNotFound(false);
      } catch (err) {
        console.error("Profile Fetch Hook Error:", err);
        
        if(err instanceof ApiError && err.status == 404){
          setProfile(null);
          setError(null);
          setNotFound(true);
        }else{
          const errorMessage = err instanceof Error ? err.message : "Could not load profile details.";
          setError(errorMessage);
          setNotFound(false);
        }
        
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [targetConsultantId, loggedInUserId]);

  return { profile, isLoading, error, notFound };
}