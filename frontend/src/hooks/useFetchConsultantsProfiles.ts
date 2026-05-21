import { useState, useEffect } from "react";
import { getConsultantProfileById, getConsultantProfileByUserId } from "../api/consultants.api";


// Maps backend DTO structures to the precise types required by your sub-cards
const mapDtoToProfile = (data: any) => {
  const nameParts = data.fullName ? data.fullName.split(" ") : ["", ""];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    id: data.id,
    firstName,
    lastName,
    status: data.availability === "AVAILABLE" ? "Available" : "Unavailable",
    email: data.email,
    phone: data.phoneNumber || "Not Provided",
    idNumber: data.idNumber || "Not Provided",
    nationality: data.nationality || "Not Provided",

    // Location sub-card mappings
    address1: data.location || "Not Provided",
    address2: "",
    suburb: "",
    city: data.location || "",
    province: "",
    postalCode: "",

    // Experience Card mapping (matches Experience interface requirements)
    experience: (data.experience || []).map((exp: any, index: number) => ({
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

    // Skills Card mapping (translates yearsExperience to yearsOfExperience)
    skills: (data.skills || []).map((s: any) => ({
      name: s.skillName,
      competencyLevel: s.competencyLevel, // BEGINNER | INTERMEDIATE | EXPERT
      yearsOfExperience: s.yearsExperience || 0,
    })),

    // Education Card mapping (translates backend certificates to education tracking UI blocks)
    education: (data.certificates || []).map((cert: any, index: number) => ({
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

export function useFetchConsultantProfile(targetConsultantId: string | undefined, loggedInUserId: string | undefined) {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        let rawData = null;

        if (targetConsultantId) {
          // Path A: A manager clicked "View Details" on a ConsultantCard
          rawData = await getConsultantProfileById(targetConsultantId);
        } else if (loggedInUserId) {
          // Path B: A consultant logged in directly, request profile via their userID
          rawData = await getConsultantProfileByUserId(loggedInUserId);
        } else {
          throw new Error("No usable identifier found to load profile.");
        }

        setProfile(mapDtoToProfile(rawData));
        setError(null);
      } catch (err: any) {
        console.error("Profile Fetch Hook Error:", err);
        setError(err.message || "Could not load profile details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [targetConsultantId, loggedInUserId]);

  return { profile, isLoading, error };
}