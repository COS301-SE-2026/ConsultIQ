import type { Project } from "../types/project.types";


function createMockProject(
    id: string,
    name: string,
    clientName: string,
    description: string,
    teamSize: number,
    allocation: number,
    budget: number,
    startDate: string,
    endDate: string,
    locationData: {
        addressLine1: string;
        addressLine2: string;
        suburb: string;
        city: string;
        province: string;
        postalCode: string;
    },
    skills: Project["skills"]
): Project {
    return {
        id,
        name,
        projectName: name,
        clientName,
        description,
        teamSize,
        allocation,
        budget,
        startDate,
        endDate,
        ...locationData, // Spreads addressLine1, suburb, etc. to root level
        location: { ...locationData }, // Duplicates it inside the location object
        skills,
    };
}

export const mockProjects: readonly Project[] = [
    createMockProject(
        "1",
        "Retail Analytics Dashboard",
        "Shoprite",
        "Develop a responsive web-based dashboard for retail analytics and inventory tracking.",
        6,
        80,
        30000,
        "2026-05-20",
        "2026-09-10",
        {
            addressLine1: "12 Rivonia Road",
            addressLine2: "Sandton Office Park",
            suburb: "Sandton",
            city: "Johannesburg",
            province: "Gauteng",
            postalCode: "2196",
        },
        [
            { id: "1", name: "React", competency: "Intermediate", years: 3, mandatory: true },
            { id: "2", name: "TypeScript", competency: "Intermediate", years: 2, mandatory: true },
        ]
    ),

    createMockProject(
        "2",
        "Mobile Banking App Enhancement",
        "FNB",
        "Upgrade banking features with biometric login and push notifications.",
        10,
        100,
        100000,
        "2026-06-01",
        "2026-12-20",
        {
            addressLine1: "1 Banker Street",
            addressLine2: "",
            suburb: "Rosebank",
            city: "Johannesburg",
            province: "Gauteng",
            postalCode: "2196",
        },
        [
            { id: "3", name: "Flutter", competency: "Advanced", years: 4, mandatory: true },
        ]
    ),

    createMockProject(
        "3",
        "AI-Powered Recruitment Platform",
        "ConsultIQ",
        "Develop an AI platform to match consultants to projects based on skills and experience.",
        8,
        70,
        500000,
        "2026-07-15",
        "2027-01-15",
        {
            addressLine1: "99 Oxford Road",
            addressLine2: "",
            suburb: "Melrose",
            city: "Johannesburg",
            province: "Gauteng",
            postalCode: "2196",
        },
        [
            { id: "4", name: "Python", competency: "Advanced", years: 5, mandatory: true },
        ]
    ),

    createMockProject(
        "4",
        "E-commerce Website Redesign",
        "Takealot",
        "Redesign the e-commerce website for improved user experience and mobile responsiveness.",
        5,
        60,
        75000,
        "2026-08-01",
        "2026-11-30",
        {
            addressLine1: "88 Main Street",
            addressLine2: "",
            suburb: "Cape Town City Centre",
            city: "Cape Town",
            province: "Western Cape",
            postalCode: "8000",
        },
        [
            { id: "5", name: "Vue.js", competency: "Intermediate", years: 3, mandatory: true },
        ]
    ),

    createMockProject(
        "5",
        "Cloud Migration Project",
        "Standard Bank",
        "Migrate on-premises applications to AWS cloud infrastructure for improved scalability.",
        12,
        90,
        200000,
        "2026-09-01",
        "2027-03-31",
        {
            addressLine1: "50 Main Street",
            addressLine2: "",
            suburb: "Johannesburg City Centre",
            city: "Johannesburg",
            province: "Gauteng",
            postalCode: "2000",
        },
        [
            { id: "6", name: "AWS", competency: "Advanced", years: 4, mandatory: true },
        ]
    ),

    createMockProject(
        "6",
        "Data Warehouse Implementation",
        "Woolworths",
        "Implement a data warehouse solution for centralized reporting and analytics.",
        7,
        75,
        120000,
        "2026-10-01",
        "2027-02-28",
        {
            addressLine1: "77 Long Street",
            addressLine2: "",
            suburb: "Cape Town City Centre",
            city: "Cape Town",
            province: "Western Cape",
            postalCode: "8000",
        },
        [
            { id: "7", name: "SQL", competency: "Advanced", years: 5, mandatory: true },
        ]
    ),

    createMockProject(
        "7",
        "Cybersecurity Assessment",
        "Discovery",
        "Conduct a comprehensive cybersecurity assessment and provide recommendations for improvement.",
        4,
        50,
        40000,
        "2026-11-01",
        "2026-12-31",
        {
            addressLine1: "33 Oxford Road",
            addressLine2: "",
            suburb: "Rosebank",
            city: "Johannesburg",
            province: "Gauteng",
            postalCode: "2196",
        },
        [
            { id: "8", name: "Cybersecurity", competency: "Advanced", years: 5, mandatory: true },
        ]
    ),
];