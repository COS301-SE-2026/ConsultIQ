export type UserRole =
            | "ADMIN"
            | "CONSULTANT_MANAGER"
            | "PROJECT_MANAGER"
            | "SUPER_ADMIN"
            | "CONSULTANT";

export const ROLES = {
    CONSULTANT: 'CONSULTANT',
    CONSULTANT_MANAGER: 'CONSULTANT_MANAGER',
    PROJECT_MANAGER: 'PROJECT_MANAGER',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];