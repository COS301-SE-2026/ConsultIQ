 const competencyMap: Record<string, string> = {
    "BEGINNER": "Beginner",
    "INTERMEDIATE": "Intermediate",
    "EXPERT": "Expert"
  };

  export const  normalizeCompetency = (text: string) : string => {
    return  competencyMap[text] || text;

  };

  export const  normalizeJobType= (text: string) : string => {
    return  jobTypeMap[text] || text;

  };

  export const  normalizeWorkModel= (text: string) : string => {
    return  workModelMap[text] || text;

  };

  const jobTypeMap: Record<string, string> = {
    "FULL_TIME": "Full time",
    "PART_TIME": "Part time",
    "CONTRACT": "Contract",
    "INTERNSHIP": "Internship",
    "FREELANCE": "Freelance"
  };

  const workModelMap: Record<string, string> = {
    "ONSITE": "Onsite",
    "REMOTE": "Remote",
    "HYBRID": "Hybrid",
  };


 