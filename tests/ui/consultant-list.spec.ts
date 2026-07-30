import { test, expect, type Page } from '@playwright/test';
import type { Role } from './placement-dashboard.spec';


const mockConsultants = {
    page: 1,
    total: 2,
    consultants: [
        {
            id: "con-001",
            fullName: "Andiswa Jonas",
            email: "andiswajonas@example.com",
            addressLine1: "45 Maple drive",
            addressLine2: "",
            suburb: "Parkhurst",
            city: "Johannesburg",
            province: "Gauteng",
            postalCode: "2196",
            availabilityStatus: "AVAILABLE",
            primarySkills: ["React", "Typescript"],
            costToCompanyRate: 850000,
            phone: "0825550192",
            idNumber: "9005145829081",
            experienceYears: 6,
            certifications: []
        },
        {
            id: "con-002",
            fullName: "Chantel van der Merwe",
            email: "chantal.vdm@example.com",
            addressLine1: "45 Kloof street",
            addressLine2: "Apartment 4b",
            suburb: "Gardens",
            city: "Cape town",
            province: "Western Cape",
            postalCode: "8001",
            availabilityStatus: "AVAILABLE",
            primarySkills: ["Python", "Java"],
            costToCompanyRate: 50000,
            phone: "0714448823",
            idNumber: "9711030192084",
            experienceYears: 3,
            certifications: ["CKA: Certified Kubernetes Administrator"]
        }
    ],
}

const mockPendingProfileUser = {
    userId: "usr-003",
    fullName: "Tariro Shingirai",
    email: "tariros@example.com",
    createdAt: "2026-07-23T19:03:08.934Z"
}


const mockNotifications = {
    notifications: [
        {
            id: "notif-001",
            userId: "usr-001",
            title: "New profile created",
            body: "",
            createdAt: "2026-07-30T08:30:00.000Z",
            link: "",
            isRead: true,
            isArchived: false,
            archivedAt: null,


        }
    ]


}




async function mockAuth(page: Page, role: Role = 'CONSULTANT_MANAGER') {
    await page.route('***/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                userId: 'test-consultant-manager-id',
                email: 'consultantmanager@consultiq.com',
                role,
                dashboardRoute: '/consultants-manager',
            })
        })
    })
}


